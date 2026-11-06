# Revenda Mais · Painel de Supervisão Comercial

Painel para a supervisão acompanhar, em tempo real, se cada lead do **Inside Sales** está sendo trabalhado no prazo: primeiro contato, tempo sem interação, demos, funil, perdas, metas e OKRs.

> **Dados simulados.** Enquanto a réplica de leitura do CRM não existe, o painel roda sobre um simulador que gera os mesmos registros que a réplica terá. Os nomes do Inside Sales são reais, mas os números de cada pessoa são **fictícios**: os perfis de comportamento são sorteados pela semente da simulação e não refletem o desempenho de ninguém.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Checa os tipos e gera o site estático em `dist/` (abre de qualquer subcaminho) |
| `npm test` | Testes das regras de tempo (SLA, horas úteis, fim de semana) e dos alertas |
| `npm run simulacao` | Imprime no terminal um resumo dos dados simulados de agora |

## Telas

Cada tela responde a uma pergunta. O título já traz a resposta, com o número que importa em rosa; abaixo vêm poucos blocos (no máximo seis), e todo número vem com contexto: meta, período anterior ou média do time.

| Menu | Pergunta que responde |
| --- | --- |
| Hoje | O que pede ação agora? Parados, sem contato, 1º contato no prazo, meta do mês, vendedores e demos do dia |
| Kanban | O quadro do CRM, com as mesmas etapas e cartões, mostrando os atrasos de cada lead |
| Agenda | As demos de hoje estão acontecendo e têm desfecho? |
| Time | Quem segue o processo e quem converte? Ranking por indicador, detalhe do vendedor e processo × resultado |
| Análises | Funil em formato de funil (onde os leads travam), Origem do lead (é ruim ou foi mal atendido?) e Perdas (por que e para onde vão) |
| Metas | Vamos bater o mês e o trimestre? |
| Fila de risco (botão preto no topo) | Qual lead está sendo esquecido? O número no botão é o de leads que pedem ação agora |
| Configurações (engrenagem) | Prazos, horário comercial, metas, alertas e alvos dos OKRs |

Clique em qualquer lead para abrir a ficha com a linha do tempo. Os endereços antigos (`/performance`, `/funil`, `/marketing`, `/perdas`) levam para as telas novas.

## Etapas do CRM

O painel usa as mesmas etapas do Kanban do CRM, na mesma ordem:

| Etapa | Quem cuida | No painel |
| --- | --- | --- |
| Lead novo - Marketing, Qualificação - SDR, Lead qualificado, SQL | IA e SDR | Fora dos indicadores. No Kanban, ficam recolhidas |
| Demonstração agendada | Vendedor | O SDR atribui o lead aqui e o prazo de 1 hora útil começa |
| Reagendar Demonstração | Vendedor | Para onde vai quem não compareceu |
| Negociação | Vendedor | Depois da demonstração realizada |
| Cadastrado | Vendedor | **Venda ganha** (contrato assinado e pago) |
| Resgate - SDR | SDR | Perda recuperável: sem retorno, adiou ou não compareceu |
| Limbo - SDR | SDR | Perda: preço, outro sistema ou concorrente |

As origens são as do cartão do CRM: Paid Search, Paid Social, Organic Search, Revenda Mais, Indicação e Referral.

## Regras de negócio

Ficam em um só lugar (`src/data/metrics/estado.ts` e `src/data/time.ts`) e valem para todas as telas.

- **SLA de primeiro contato:** 1 hora útil (segunda a sexta, 8h às 18h), contada a partir de quando o SDR atribui o lead ao vendedor. Se o SDR troca o vendedor, o prazo recomeça.
- **Lead em atenção / parado:** 24h / 48h sem interação, em horas corridas sem contar sábado e domingo.
- **Venda ganha:** o vendedor move o lead para Cadastrado quando o contrato está assinado e pago. Conta no mês em que foi movido.
- **Perda:** o vendedor move o lead para Resgate - SDR ou Limbo - SDR, sempre com o motivo da lista obrigatória.
- **Demo sem desfecho:** horário da demo + 1 hora sem "realizada" nem "não compareceu".
- **Horário do registro:** o SLA usa o horário do servidor (`registradoEm`), não o informado pelo vendedor.
- **Projeção do mês:** cadastros + ritmo × dias úteis restantes. Nos primeiros dias o ritmo do mês é combinado com o do mês anterior, para não oscilar.

Feriados podem ser descontados em Configurações (desligado até a supervisão decidir).

## Arquitetura

```
src/
  data/
    types.ts            tipos que espelham as tabelas da réplica (o contrato com a TI)
    time.ts             fuso de São Paulo, horas úteis e horas corridas sem fim de semana
    params.ts           regras padrão, feriados e OKRs
    source.ts           FonteDeDados: FonteSimulada (hoje) e FonteApi (réplica)
    simulator/          gerador determinístico do ciclo de vida de cada lead
    metrics/
      estado.ts         estado de cada lead agora e seus alertas
      indicadores.ts    todos os indicadores do plano
      okr.ts            valor e progresso dos resultados-chave
  state/painel.tsx      configurações, relógio (recalcula a cada minuto) e carga dos dados
  components/
    ui/                 componentes do shadcn/ui (gerados pelo CLI, não editar à mão)
    kit.tsx             título da tela, cartões, número, medidor, pílulas e botões de seta
    crm.tsx             cartão de lead e etiquetas no estilo do CRM
    motion.tsx          entradas em cascata e números que contam
    wave.tsx            a textura de onda dos cartões de destaque
  layout/               menu em pílulas no topo e ficha do lead
  pages/                as telas (Análises junta Funil, Marketing e Perdas em abas)
db/schema.sql           tabelas da réplica e gatilho dos históricos (PostgreSQL)
```

### Ligando na réplica do CRM

As telas e as fórmulas só conhecem a interface `FonteDeDados`. Para usar dados reais:

1. Criar a API do painel lendo a réplica e devolvendo um `Dataset` (formato em `src/data/types.ts`, tabelas em `db/schema.sql`):
   `GET /api/painel/dataset?desde=<epoch ms>&ate=<epoch ms>`
2. Gerar o build com a variável `VITE_PAINEL_API_URL` apontando para essa API. A `FonteApi` passa a ser usada no lugar do simulador.
3. Os cálculos de `src/data/metrics` são TypeScript puro e também podem rodar no servidor, se a TI preferir entregar os indicadores prontos.

Os dois históricos (atribuição e etapas) não existem hoje no CRM e são a **primeira entrega da Fase 1**: o histórico só começa a contar a partir do dia em que for criado. `db/schema.sql` traz um gatilho que grava os dois sem mudar telas do CRM.

### Simulador

`src/data/simulator` gera cerca de 200 leads por mês para os 8 vendedores, com a hora atual: passagem pela pré-vendas, atribuição pelo SDR, primeiro contato, acompanhamentos, demo (faltas vão para Reagendar Demonstração), negociação, Cadastrado ou perda (Resgate ou Limbo), próximos passos e registros feitos com atraso. Os eventos são planejados inteiros e "materializados" no instante atual, então o painel muda sozinho ao longo do dia. A semente pode ser trocada em Configurações.

## Interface

- **Visual:** fundo cinza-claro, cartões brancos com borda fina, um cartão **rosa** para o que pede ação e um **preto** para a meta. Rosa sempre quer dizer problema ou ação; preto, meta ou destaque neutro; cinza, o resto. Títulos grandes em Inter Tight, menu e filtros em pílulas, e a textura de onda só nos cartões de destaque.
- **Peças:** `src/components/kit.tsx` (título da tela, cartão, número, medidor com meta, pílulas, botões de seta) e `src/components/wave.tsx` (a onda). Formulários e a ficha do lead usam [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS 4) com React 19 e ícones Lucide.
- **Cores:** variáveis em `src/index.css`, com o rosa Revenda Mais como cor primária. O modo claro é o padrão; o escuro é opcional, no botão de lua do topo, e fica salvo no navegador de quem escolheu (no escuro, o cartão preto vira o cartão claro). Logos em `public/brand/` (versão branca para o modo escuro).
- **Movimento:** [Motion](https://motion.dev). As telas entram em cascata, os números contam até o valor, as barras crescem, o destaque das pílulas desliza, a onda deriva devagar e, no Kanban, o cartão desliza para a coluna nova quando o lead muda de etapa. Quem ativa "reduzir movimento" no sistema vê tudo parado.
