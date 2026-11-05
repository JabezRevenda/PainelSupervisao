import { motion } from 'motion/react';
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { NameAvatar, PageHeader } from '@/components/kit';
import { Page, Reveal, Stagger, itemVariants } from '@/components/motion';
import { META_PADRAO_POR_VENDEDOR } from '@/data/params';
import type { Parametros } from '@/data/types';
import { type AlertasConfig, usePainel } from '@/state/painel';

const DIAS: [number, string][] = [
  [1, 'Seg'],
  [2, 'Ter'],
  [3, 'Qua'],
  [4, 'Qui'],
  [5, 'Sex'],
  [6, 'Sáb'],
  [0, 'Dom'],
];

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const paraMin = (v: string) => {
  const [h, m] = v.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Linha de configuração com texto à esquerda e controle à direita. */
function Linha({ id, titulo, ajuda, children }: { id: string; titulo: string; ajuda?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={id} className="font-medium">
          {titulo}
        </Label>
        {ajuda && <span className="text-xs text-muted-foreground">{ajuda}</span>}
      </div>
      {children}
    </div>
  );
}

function CampoNumero({ id, rotulo, valor, unidade, min, step, onChange, ajuda }: { id: string; rotulo: string; valor: number; unidade: string; min: number; step?: number; onChange: (v: number) => void; ajuda?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={min} step={step} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="num w-24" />
        <span className="text-sm text-muted-foreground">{unidade}</span>
      </div>
      {ajuda && <p className="text-xs leading-relaxed text-muted-foreground">{ajuda}</p>}
    </div>
  );
}

export function Configuracoes() {
  const { config, setConfig, resetConfig, vendedores, metas, okrs, ds, fonte } = usePainel();
  const p = config.params;
  const setP = (patch: Partial<Parametros>) => setConfig((c) => ({ ...c, params: { ...c.params, ...patch } }));
  const setAlerta = (k: keyof AlertasConfig, v: boolean) => setConfig((c) => ({ ...c, alertas: { ...c.alertas, [k]: v } }));
  const totalMeta = Object.values(metas).reduce((a, b) => a + b, 0);
  const sdrs = ds.usuarios.filter((u) => u.funcao === 'sdr');

  const alertas: [keyof AlertasConfig, string, string][] = [
    ['slaEstourado', 'Lead sem contato após o SLA', 'Etiqueta na Fila de risco e no Kanban'],
    ['parado', 'Lead parado', `Mais de ${p.paradoHoras}h sem interação`],
    ['atencao', 'Lead em atenção', `De ${p.atencaoHoras}h a ${p.paradoHoras}h sem interação`],
    ['resumoDoDia', 'Resumo do dia ao abrir o CRM', 'Por vendedor: sem contato, parados e demos sem desfecho'],
    ['sinalVendedor', 'Sinal na lista do vendedor', 'Opcional: o vendedor vê os próprios atrasos'],
  ];

  return (
    <Page>
      <PageHeader
        title="Configurações"
        description="As regras do painel mudam aqui, sem depender da TI. Toda mudança vale na hora para todas as telas. Neste protótipo ela fica salva no navegador; com a réplica do CRM, fica na tabela de parâmetros."
        actions={
          <Button variant="outline" size="sm" onClick={resetConfig}>
            Restaurar padrões
          </Button>
        }
      />

      <Stagger className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Prazos</CardTitle>
              <CardDescription>Definem o SLA, os alertas e a Fila de risco</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <CampoNumero
                id="cfg-sla"
                rotulo="Primeiro contato do vendedor"
                valor={p.slaPrimeiroContatoMin}
                unidade="minutos úteis"
                min={5}
                step={5}
                onChange={(v) => setP({ slaPrimeiroContatoMin: Math.max(5, v || 60) })}
                ajuda="Conta de quando o SDR atribui o lead ao vendedor em Demonstração agendada. Se o SDR trocar o vendedor, o prazo começa de novo."
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <CampoNumero id="cfg-atencao" rotulo="Lead em atenção após" valor={p.atencaoHoras} unidade="horas" min={1} onChange={(v) => setP({ atencaoHoras: Math.max(1, v || 24) })} />
                <CampoNumero id="cfg-parado" rotulo="Lead parado após" valor={p.paradoHoras} unidade="horas" min={1} onChange={(v) => setP({ paradoHoras: Math.max(1, v || 48) })} />
              </div>
              <div className="flex flex-col divide-y border-t">
                <Linha id="cfg-fds" titulo="Não contar sábado e domingo" ajuda="Vale para os prazos de em atenção e parado (horas corridas)">
                  <Switch id="cfg-fds" checked={p.descontarFimDeSemana} onCheckedChange={(v) => setP({ descontarFimDeSemana: v })} />
                </Linha>
                <Linha id="cfg-feriados" titulo="Descontar feriados nacionais" ajuda={<span className="text-warning-foreground">Em definição com a supervisão</span>}>
                  <Switch id="cfg-feriados" checked={p.descontarFeriados} onCheckedChange={(v) => setP({ descontarFeriados: v })} />
                </Linha>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Horário comercial</CardTitle>
              <CardDescription>Usado no SLA de primeiro contato</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Dias úteis</Label>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  size="sm"
                  aria-label="Dias úteis"
                  value={p.diasUteis.map(String)}
                  onValueChange={(v) => setP({ diasUteis: v.map(Number) })}
                  className="flex-wrap"
                >
                  {DIAS.map(([d, rot]) => (
                    <ToggleGroupItem key={d} value={String(d)} className="w-12 data-[state=on]:border-primary/40 data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                      {rot}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cfg-ini">Início</Label>
                  <Input id="cfg-ini" type="time" value={hhmm(p.inicioMin)} onChange={(e) => setP({ inicioMin: paraMin(e.target.value) })} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cfg-fim">Fim</Label>
                  <Input id="cfg-fim" type="time" value={hhmm(p.fimMin)} onChange={(e) => setP({ fimMin: paraMin(e.target.value) })} />
                </div>
              </div>
              <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
                Exemplo: lead atribuído sexta às 17h30 tem prazo até segunda às 8h30 (30 minutos na sexta e 30 na segunda).
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Metas do mês</CardTitle>
              <CardDescription>Cadastros por vendedor</CardDescription>
              <CardAction className="text-sm text-muted-foreground">
                Total do time <span className="num ml-1 text-lg font-semibold text-foreground">{totalMeta}</span>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-x-6 sm:grid-cols-2">
              {vendedores.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 border-b py-2">
                  <Label htmlFor={`meta-${v.id}`} className="flex items-center gap-2.5 font-normal">
                    <NameAvatar nome={v.nome} size={24} />
                    {v.nome}
                  </Label>
                  <Input
                    id={`meta-${v.id}`}
                    type="number"
                    min={0}
                    className="num h-8 w-16 text-right"
                    value={metas[v.id] ?? META_PADRAO_POR_VENDEDOR}
                    onChange={(e) => setConfig((c) => ({ ...c, metas: { ...c.metas, [v.id]: Math.max(0, Number(e.target.value) || 0) } }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
              <CardDescription>Só dentro do painel e do CRM</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {alertas.map(([k, t, a]) => (
                <Linha key={k} id={`alerta-${k}`} titulo={t} ajuda={a}>
                  <Switch id={`alerta-${k}`} checked={config.alertas[k]} onCheckedChange={(v) => setAlerta(k, v)} />
                </Linha>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </Stagger>

      <Reveal>
        <Card>
          <CardHeader>
            <CardTitle>Alvos dos OKRs</CardTitle>
            <CardDescription>Os alvos de exemplo devem ser revistos depois de 30 dias de medição</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 md:grid-cols-2 xl:grid-cols-3">
            {okrs.flatMap((o) =>
              o.resultados.map((kr) => (
                <div key={kr.id} className="flex items-center justify-between gap-3 border-b py-2">
                  <Label htmlFor={`kr-${kr.id}`} className="block leading-snug font-normal">
                    <span className="text-muted-foreground">{o.codigo} · </span>
                    {kr.nome}
                  </Label>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Input
                      id={`kr-${kr.id}`}
                      type="number"
                      min={0}
                      className="num h-8 w-18 text-right"
                      value={kr.alvo}
                      onChange={(e) => setConfig((c) => ({ ...c, alvosOkr: { ...c.alvosOkr, [kr.id]: Math.max(0, Number(e.target.value) || 0) } }))}
                    />
                    <span className="w-3 text-sm text-muted-foreground">{kr.unidade}</span>
                  </div>
                </div>
              )),
            )}
          </CardContent>
        </Card>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Equipe acompanhada</CardTitle>
            <CardDescription>Vem da tabela de usuários do CRM. SDRs e time externo ficam fora dos indicadores.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {vendedores.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <NameAvatar nome={v.nome} size={30} />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{v.nome}</span>
                  <span className="text-xs text-muted-foreground">Inside Sales</span>
                </span>
              </div>
            ))}
            {sdrs.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border border-dashed p-2.5 text-muted-foreground">
                <NameAvatar nome={v.nome} size={30} className="opacity-60" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{v.nome}</span>
                  <span className="text-xs">Pré-vendas · fora do painel</span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origem dos dados</CardTitle>
            <CardDescription>{fonte.simulada ? 'Hoje os dados vêm do simulador' : 'Conectado à réplica do CRM'}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              O simulador gera leads, interações, demos, cadastros e perdas no ritmo do Inside Sales (cerca de 200 leads por mês), até a hora atual. Os perfis de comportamento são
              sorteados entre os vendedores pela semente e não refletem o desempenho real de ninguém.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cfg-semente">Semente da simulação</Label>
              <Input id="cfg-semente" value={config.semente} onChange={(e) => setConfig((c) => ({ ...c, semente: e.target.value || 'revenda-mais' }))} />
            </div>
            <Button variant="outline" size="sm" className="self-start" onClick={() => setConfig((c) => ({ ...c, semente: Math.random().toString(36).slice(2, 8) }))}>
              Sortear outra simulação
            </Button>
          </CardContent>
        </Card>
      </Reveal>
    </Page>
  );
}
