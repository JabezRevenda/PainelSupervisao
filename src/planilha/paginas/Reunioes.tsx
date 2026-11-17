import { motion } from 'motion/react';
import { type ReactNode, useMemo, useState } from 'react';
import { Bloco, Contexto, Dot, fmtPct, Hl, Intro, NameAvatar, Pilulas } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtDate } from '@/data/time';
import { nomeCurto, usePlanilha } from '../estado';
import { porSemana, porVendedor, type Realizada, REALIZADA_INFO, resumir } from '../modelo';
import { BarraReunioes, TabelaLeads } from '../pecas';

type Filtro = 'todas' | Realizada;

export function Reunioes() {
  const { mes, leads, anterior } = usePlanilha();
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [vendedor, setVendedor] = useState('todos');

  const d = useMemo(() => {
    const r = resumir(leads);
    const rAnt = anterior ? resumir(anterior.ls) : null;
    const semanas = porSemana(mes.chave, leads);
    const vend = porVendedor(leads);
    return { r, rAnt, semanas, vend };
  }, [leads, anterior, mes.chave]);
  const { r, rAnt, semanas, vend } = d;

  const doVendedor = vendedor === 'todos' ? leads : leads.filter((l) => l.vendedor === vendedor);
  const conta = (f: Realizada) => doVendedor.filter((l) => l.realizada === f).length;
  const lista = (filtro === 'todas' ? doVendedor : doVendedor.filter((l) => l.realizada === filtro)).slice().sort((a, b) => b.t - a.t || a.vendedor.localeCompare(b.vendedor));
  const maxSem = Math.max(1, ...semanas.map((s) => s.agendadas));
  const nomeMes = nomeCurto(mes);
  const negDireta = leads.filter((l) => l.tipo === 'negociacao_direta').length;

  const numeros: [string, number, string, string][] = [
    ['Agendadas', r.recebidos, rAnt ? `${nomeCurto(anterior!.mes)}: ${rAnt.recebidos}` : 'no mês', 'var(--track)'],
    ['Realizadas', r.realizadas, `${fmtPct(r.realizacao)} das agendadas`, REALIZADA_INFO.sim.cor],
    ['Não compareceram', r.naoCompareceram, `comparecimento ${fmtPct(r.comparecimento)}`, REALIZADA_INFO.nao.cor],
    ['Sem desfecho', r.semDesfecho, 'marcadas como Pendente', REALIZADA_INFO.pendente.cor],
  ];

  return (
    <Page className="gap-8">
      <Intro
        tag={`Reuniões · ${mes.nome.toLowerCase()}`}
        title={
          <>
            <Hl>
              {r.recebidos} reuniões agendadas
            </Hl>{' '}
            em {nomeMes}, {r.realizadas} realizadas.
          </>
        }
        aside={
          <>
            {r.naoCompareceram} leads não compareceram e {r.semDesfecho} reuniões ainda estão sem desfecho na planilha.
            {negDireta > 0 && ` ${negDireta} foram negociação direta, sem demonstração.`}
          </>
        }
      />

      <Bloco className="gap-6">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-4">
          {numeros.map(([rot, n, ctx, cor]) => (
            <div key={rot} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Dot color={cor} className={rot === 'Agendadas' ? 'border border-ink/30' : ''} />
                {rot}
              </span>
              <span className="display num text-[44px] leading-none">{n}</span>
              <span className="text-xs text-muted-foreground">{ctx}</span>
            </div>
          ))}
        </div>
        <BarraReunioes realizadas={r.realizadas} nao={r.naoCompareceram} pendentes={r.semDesfecho} className="h-2.5" />
      </Bloco>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Semana a semana" className="lg:col-span-2">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm border border-ink/30 bg-track" /> agendadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-ink" /> realizadas
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {semanas.map((s, i) => (
              <div key={s.ini} className="grid grid-cols-[96px_1fr_88px] items-center gap-3 text-sm">
                <span className="flex flex-col leading-tight">
                  <span>{s.rotulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(s.ini)} a {fmtDate(s.fim - 1)}
                  </span>
                </span>
                <div className="relative h-6 rounded-md bg-track/60">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-md bg-track ring-1 ring-ink/15 ring-inset"
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.agendadas / maxSem) * 100}%` }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.05 }}
                  />
                  <motion.div
                    className="absolute inset-y-1 left-1 rounded-[4px] bg-ink"
                    initial={{ width: 0 }}
                    animate={{ width: `calc(${(s.realizadas / maxSem) * 100}% - 8px)` }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.2 + i * 0.05 }}
                    style={{ minWidth: s.realizadas ? 4 : 0 }}
                  />
                </div>
                <span className="num text-right">
                  <span className="font-medium">{s.realizadas}</span>
                  <span className="text-muted-foreground"> de {s.agendadas}</span>
                </span>
              </div>
            ))}
            {semanas.length === 0 && <p className="text-sm text-muted-foreground">Sem reuniões com data neste mês.</p>}
          </div>
          <Contexto className="text-muted-foreground opacity-100" itens={['pela data do agendamento na planilha', 'o restante da semana em aberto ainda pode ganhar desfecho']} />
        </Bloco>

        <Bloco titulo="Por vendedor">
          <ul className="flex flex-col gap-3">
            {vend.map((v) => (
              <li key={v.nome} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <NameAvatar nome={v.nome} size={22} />
                    {v.nome}
                  </span>
                  <span className="num">
                    <span className="font-medium">{v.realizadas}</span>
                    <span className="text-muted-foreground"> de {v.recebidos}</span>
                  </span>
                </div>
                <BarraReunioes realizadas={v.realizadas} nao={v.naoCompareceram} pendentes={v.semDesfecho} className="h-1.5" />
              </li>
            ))}
          </ul>
          <Contexto className="text-muted-foreground opacity-100" itens={['realizadas de agendadas', 'preto realizada · rosa faltou · amarelo sem desfecho']} />
        </Bloco>
      </div>

      <Stagger>
        <Bloco titulo={`Todas as reuniões de ${nomeMes}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Pilulas
              id="reunioes"
              label="Filtrar reuniões"
              value={filtro}
              onChange={setFiltro}
              options={[
                ['todas', <>Todas <span className="num opacity-60">{doVendedor.length}</span></>],
                ...(['sim', 'nao', 'pendente'] as Realizada[]).map(
                  (f) =>
                    [
                      f,
                      <>
                        {REALIZADA_INFO[f].rotulo} <span className="num opacity-60">{conta(f)}</span>
                      </>,
                    ] as [Filtro, ReactNode],
                ),
              ]}
            />
            <Select value={vendedor} onValueChange={setVendedor}>
              <SelectTrigger className="h-9 w-48 rounded-full bg-card" aria-label="Vendedor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os vendedores</SelectItem>
                {vend.map((v) => (
                  <SelectItem key={v.nome} value={v.nome}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TabelaLeads itens={lista} limite={25} vazio="Nenhuma reunião neste filtro." />
        </Bloco>
      </Stagger>
    </Page>
  );
}
