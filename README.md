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

| Tela | Pergunta que responde |
| --- | --- |
| Visão geral | Como está o time agora? Parados, sem contato, meta do mês, SLA, ranking |
| Fila de risco | Qual lead está sendo esquecido? Cronômetro do prazo de 1 hora e ficha do lead |
| Agenda de demos | As demos estão acontecendo e têm desfecho? |
| Performance | Quem segue o processo e quem converte? Mapa de horários de cada vendedor |
| Funil e conversão | Onde os leads travam e quanto tempo levam em cada etapa? |
| Marketing e origem | O lead é ruim ou foi mal atendido? Conversão dentro e fora do prazo por canal |
| Perdas | Por que perdemos? Perdas sem nenhuma interação |
| Metas e OKRs | Vamos bater o mês e o trimestre? |
| Configurações | Prazos, horário comercial, metas, alertas e alvos dos OKRs |

Clique em qualquer lead para abrir a ficha com a linha do tempo. Há tema escuro e claro (botão no topo).

## Regras de negócio

Ficam em um só lugar (`src/data/metrics/estado.ts` e `src/data/time.ts`) e valem para todas as telas.

- **SLA de primeiro contato:** 1 hora útil (segunda a sexta, 8h às 18h), contada a partir de quando o SDR atribui o lead ao vendedor. Se o SDR troca o vendedor, o prazo recomeça.
- **Lead em atenção / parado:** 24h / 48h sem interação, em horas corridas sem contar sábado e domingo.
- **Venda ganha:** o vendedor marca Ganho quando o contrato está assinado e pago. Conta no mês da marcação.
- **Demo sem desfecho:** horário da demo + 1 hora sem "realizada" nem "não compareceu".
- **Horário do registro:** o SLA usa o horário do servidor (`registradoEm`), não o informado pelo vendedor.
- **Projeção do mês:** ganhos + ritmo × dias úteis restantes. Nos primeiros dias o ritmo do mês é combinado com o do mês anterior, para não oscilar.

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
  layout/               menu, barra superior e ficha do lead
  pages/                as 9 telas
  ui/                   componentes, gráficos e ícones
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

`src/data/simulator` gera cerca de 200 leads por mês para os 8 vendedores, com a hora atual: atribuição pelo SDR, primeiro contato, acompanhamentos, demo (com faltas e remarcações), proposta, negociação, ganho ou perda, próximos passos e registros feitos com atraso. Os eventos são planejados inteiros e "materializados" no instante atual, então o painel muda sozinho ao longo do dia. A semente pode ser trocada em Configurações.

## Identidade visual

Rosa Revenda Mais (`#E6234E`, tirado da logo), preto e branco. Títulos e números em Poppins, texto em Inter. Logos em `public/brand/` (versão branca para o tema escuro).
