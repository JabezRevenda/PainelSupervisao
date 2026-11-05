-- =====================================================================
-- Painel de Supervisão Comercial · Revenda Mais
-- Tabelas que a réplica de leitura precisa conter (sintaxe PostgreSQL).
--
-- Os nomes de tabelas e colunas são uma proposta: se o CRM já tiver
-- tabelas equivalentes, a API do painel só precisa devolver o mesmo
-- formato de `Dataset` (src/data/types.ts).
--
-- Situação (do plano):
--   [existe]  leads, interacoes, usuarios, motivos_perda, etapas
--   [criar]   historico_atribuicao, historico_etapas, parametros, metas, okrs
--   [confirmar] tarefas, demonstracoes
-- =====================================================================

-- ---------- usuários e equipes [existe] ----------
CREATE TABLE usuarios (
  id            TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  funcao        TEXT NOT NULL CHECK (funcao IN ('vendedor', 'sdr', 'supervisao')),
  equipe        TEXT NOT NULL CHECK (equipe IN ('inside_sales', 'pre_vendas', 'externo')),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------- leads / negócios [existe] ----------
CREATE TABLE leads (
  id            TEXT PRIMARY KEY,
  criado_em     TIMESTAMPTZ NOT NULL,
  revenda       TEXT NOT NULL,
  contato       TEXT NOT NULL,              -- nome do contato, como digitado no CRM
  cidade        TEXT,
  uf            CHAR(2),
  canal         TEXT NOT NULL,              -- origem: paid_search | paid_social | organic_search | revenda_mais | indicacao | referral
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  -- Etapas do CRM, na ordem do Kanban:
  --   pré-vendas: lead_novo | qualificacao_sdr | lead_qualificado | sql
  --   vendedor:   demo_agendada | reagendar_demo | negociacao
  --   ganho:      cadastrado (contrato assinado e pago)
  --   saídas:     resgate_sdr | limbo_sdr (o vendedor perdeu e o lead volta para a pré-vendas)
  etapa_atual   TEXT NOT NULL,
  vendedor_id   TEXT REFERENCES usuarios(id)
);

-- ---------- histórico de atribuição [CRIAR · Fase 1, primeira entrega] ----------
-- Início do prazo de 1 hora útil. Uma linha por atribuição ou troca de vendedor.
CREATE TABLE historico_atribuicao (
  id                    BIGSERIAL PRIMARY KEY,
  lead_id               TEXT NOT NULL REFERENCES leads(id),
  vendedor_anterior_id  TEXT REFERENCES usuarios(id),
  vendedor_novo_id      TEXT NOT NULL REFERENCES usuarios(id),
  atribuido_por_id      TEXT REFERENCES usuarios(id),
  em                    TIMESTAMPTZ NOT NULL DEFAULT now()  -- horário do servidor
);
CREATE INDEX ON historico_atribuicao (lead_id, em);

-- ---------- histórico de etapas [CRIAR · Fase 1, primeira entrega] ----------
CREATE TABLE historico_etapas (
  id               BIGSERIAL PRIMARY KEY,
  lead_id          TEXT NOT NULL REFERENCES leads(id),
  de               TEXT,
  para             TEXT NOT NULL,
  em               TIMESTAMPTZ NOT NULL DEFAULT now(),       -- horário do servidor
  usuario_id       TEXT REFERENCES usuarios(id),
  motivo_perda_id  TEXT                                       -- só quando para = 'resgate_sdr' ou 'limbo_sdr'
);
CREATE INDEX ON historico_etapas (lead_id, em);

-- Gatilho: grava os dois históricos sem mudar nenhuma tela do CRM.
-- O CRM precisa definir, na sessão do banco, quem fez a alteração:
--   SET LOCAL app.usuario_id = '<id do usuário>';
CREATE OR REPLACE FUNCTION registrar_historico_lead() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.vendedor_id IS DISTINCT FROM OLD.vendedor_id THEN
    INSERT INTO historico_atribuicao (lead_id, vendedor_anterior_id, vendedor_novo_id, atribuido_por_id)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.vendedor_id END, NEW.vendedor_id,
            current_setting('app.usuario_id', true));
  END IF;
  IF TG_OP = 'INSERT' OR NEW.etapa_atual IS DISTINCT FROM OLD.etapa_atual THEN
    INSERT INTO historico_etapas (lead_id, de, para, usuario_id, motivo_perda_id)
    VALUES (NEW.id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.etapa_atual END, NEW.etapa_atual,
            current_setting('app.usuario_id', true),
            current_setting('app.motivo_perda_id', true));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historico_lead
AFTER INSERT OR UPDATE OF vendedor_id, etapa_atual ON leads
FOR EACH ROW EXECUTE FUNCTION registrar_historico_lead();

-- ---------- interações / anotações [existe] ----------
CREATE TABLE interacoes (
  id             TEXT PRIMARY KEY,
  lead_id        TEXT NOT NULL REFERENCES leads(id),
  usuario_id     TEXT NOT NULL REFERENCES usuarios(id),
  tipo           TEXT NOT NULL,     -- whatsapp_enviado | lead_respondeu | tentativa_sem_resposta | videochamada | email
  via            TEXT NOT NULL,     -- whatsapp_crm | registro_rapido | manual   (a confirmar com a TI)
  registrado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),   -- horário do servidor: é o que o SLA usa
  ocorrido_em    TIMESTAMPTZ                             -- horário informado pelo vendedor (a confirmar)
);
CREATE INDEX ON interacoes (lead_id, registrado_em);

-- ---------- tarefas e próximos passos [confirmar] ----------
CREATE TABLE tarefas (
  id             TEXT PRIMARY KEY,
  lead_id        TEXT NOT NULL REFERENCES leads(id),
  usuario_id     TEXT NOT NULL REFERENCES usuarios(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  previsto_para  TIMESTAMPTZ NOT NULL,
  concluido_em   TIMESTAMPTZ
);

-- ---------- demonstrações [confirmar] ----------
CREATE TABLE demonstracoes (
  id             TEXT PRIMARY KEY,
  lead_id        TEXT NOT NULL REFERENCES leads(id),
  vendedor_id    TEXT NOT NULL REFERENCES usuarios(id),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  agendada_para  TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('agendada', 'realizada', 'nao_compareceu', 'cancelada')),
  desfecho_em    TIMESTAMPTZ
);

-- ---------- motivos de perda [existe] ----------
CREATE TABLE motivos_perda (
  id    TEXT PRIMARY KEY,
  nome  TEXT NOT NULL
);

-- ---------- parâmetros [CRIAR] (tela de Configurações) ----------
CREATE TABLE parametros (
  id                         SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  sla_primeiro_contato_min   INT NOT NULL DEFAULT 60,
  atencao_horas              INT NOT NULL DEFAULT 24,
  parado_horas               INT NOT NULL DEFAULT 48,
  dias_uteis                 SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  inicio_min                 INT NOT NULL DEFAULT 480,    -- 08:00
  fim_min                    INT NOT NULL DEFAULT 1080,   -- 18:00
  descontar_fim_de_semana    BOOLEAN NOT NULL DEFAULT TRUE,
  descontar_feriados         BOOLEAN NOT NULL DEFAULT FALSE,
  atualizado_em              TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por             TEXT REFERENCES usuarios(id)
);
CREATE TABLE feriados (dia DATE PRIMARY KEY, nome TEXT);

-- ---------- metas [CRIAR] ----------
CREATE TABLE metas (
  periodo      CHAR(7) NOT NULL,                 -- AAAA-MM
  vendedor_id  TEXT NOT NULL REFERENCES usuarios(id),
  indicador    TEXT NOT NULL DEFAULT 'contratos_ganhos',
  alvo         INT NOT NULL,
  PRIMARY KEY (periodo, vendedor_id, indicador)
);

-- ---------- OKRs [CRIAR] ----------
CREATE TABLE okr_objetivos (
  id         TEXT PRIMARY KEY,
  trimestre  CHAR(7) NOT NULL,                   -- AAAA-QN
  codigo     TEXT NOT NULL,
  titulo     TEXT NOT NULL
);
CREATE TABLE okr_resultados (
  id            TEXT PRIMARY KEY,
  objetivo_id   TEXT NOT NULL REFERENCES okr_objetivos(id),
  nome          TEXT NOT NULL,
  indicador     TEXT NOT NULL,   -- sla_1h | parados_agora | com_proximo_passo | contratos_mes | uso_whatsapp_crm | perdas_sem_interacao
  linha_de_base NUMERIC,
  alvo          NUMERIC NOT NULL,
  menor_melhor  BOOLEAN NOT NULL DEFAULT FALSE
);
