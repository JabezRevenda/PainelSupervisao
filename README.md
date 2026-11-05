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
| Kanban de hoje | O quadro do CRM, com as mesmas etapas e cartões, mostrando os atrasos de cada lead |
| Fila de risco | Qual lead está sendo esquecido? Cronômetro do prazo de 1 hora e ficha do lead |
| Agenda de demos | As demos estão acontecendo e têm desfecho? |
| Performance | Quem segue o processo e quem converte? Mapa de horários de cada vendedor |
| Funil e conversão | Onde os leads travam e quanto tempo levam em cada etapa? |
| Marketing e origem | O lead é ruim ou foi mal atendido? Conversão dentro e fora do prazo por canal |
| Perdas | Por que perdemos? Quanto vai para Resgate e para Limbo, e o que saiu sem nenhuma interação |
| Metas e OKRs | Vamos bater o mês e o trimestre? |
| Configurações | Prazos, horário comercial, metas, alertas e alvos dos OKRs |

Clique em qualquer lead para abrir a ficha com a linha do tempo. O tema claro é o padrão; o escuro fica no botão do topo.

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
    kit.tsx             cabeçalho de página, cartão de indicador, avatar com iniciais
    crm.tsx             cartão de lead e etiquetas no estilo do CRM
    motion.tsx          entradas em cascata, números que contam, barras que crescem
    charts.tsx          linha, meia-lua da meta, anel e colunas empilhadas
  layout/               menu lateral, barra superior e ficha do lead
  pages/                as 10 telas
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

- **Componentes:** [shadcn/ui](https://ui.shadcn.com) (Radix + Tailwind CSS 4), React 19, ícones Lucide e fonte Geist. Para adicionar um componente: `npx shadcn@latest add <nome>`.
- **Cores:** as variáveis do shadcn em `src/index.css`, com o rosa Revenda Mais como cor primária. Logos em `public/brand/` (versão branca para o tema escuro).
- **Movimento:** [Motion](https://motion.dev). As telas entram em cascata, os números contam até o valor, as barras crescem e, no Kanban, o cartão desliza para a coluna nova quando o lead muda de etapa. Quem ativa "reduzir movimento" no sistema vê tudo parado.
