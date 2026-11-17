import { motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bloco, Contexto, fmtNum, fmtPct, Hl, Intro, NameAvatar, Pilulas } from '@/components/kit';
import { EASE, Page, SPRING } from '@/components/motion';
import { cn } from '@/lib/utils';
import { nomeCurto, usePlanilha } from '../estado';
import { type LinhaVendedorP, porVendedor, resumir } from '../modelo';
import { TabelaLeads } from '../pecas';

type Ordem = 'recebidos' | 'conversao' | 'ganhos';

const ORDEM: Record<Ordem, { rotulo: string; pergunta: string; valor: (l: LinhaVendedorP) => number }> = {
  recebidos: { rotulo: 'Leads recebidos', pergunta: 'Quantos leads cada vendedor recebeu com reunião agendada', valor: (l) => l.recebidos },
  conversao: { rotulo: 'Conversão', pergunta: 'Quanto dos leads recebidos virou ganho', valor: (l) => l.conversao ?? 0 },
  ganhos: { rotulo: 'Ganhos', pergunta: 'Quantos ganhos (Ganho ou Cadastrado) cada um fez', valor: (l) => l.ganhos },
};

export function Time() {
  const { mes, leads, anterior } = usePlanilha();
  const [params, setParams] = useSearchParams();
  const [ordem, setOrdem] = useState<Ordem>('recebidos');

  const { linhas, time, ant } = useMemo(() => {
    const linhas = porVendedor(leads);
    const ant = new Map((anterior ? porVendedor(anterior.ls) : []).map((l) => [l.nome, l]));
    return { linhas, time: resumir(leads), ant };
  }, [leads, anterior]);

  const cfg = ORDEM[ordem];
  const ranking = [...linhas].sort((a, b) => cfg.valor(b) - cfg.valor(a) || b.recebidos - a.recebidos);
  const maxV = ordem === 'conversao' ? 100 : Math.max(1, ...linhas.map(cfg.valor));
  const sel = linhas.find((l) => l.nome === params.get('v')) ?? ranking[0];
  const selecionar = (nome: string) => setParams({ v: nome }, { replace: true });
  const nomeMes = nomeCurto(mes);
  const mediaRecebidos = linhas.length ? time.recebidos / linhas.length : 0;
  const top = [...linhas].sort((a, b) => b.recebidos - a.recebidos)[0];
  const marcaTime = ordem === 'conversao' ? time.conversao : ordem === 'recebidos' ? (mediaRecebidos / maxV) * 100 : linhas.length ? (time.ganhos / linhas.length / maxV) * 100 : null;

  return (
    <Page className="gap-8">
      <Intro
        tag={`Time · ${mes.nome.toLowerCase()}`}
        title={
          <>
            <Hl>{time.recebidos} leads</Hl> para {linhas.length} vendedores em {nomeMes}. Conversão do time: {fmtPct(time.conversao)}.
          </>
        }
        aside={
          <>
            Lead recebido é o lead que o SDR passou com reunião agendada. Conversão = ganhos ÷ leads recebidos.{' '}
            {top && `${top.nome} recebeu mais (${top.recebidos}).`} {time.abertos > 0 && `${time.abertos} leads do mês ainda estão em acompanhamento, então a conversão ainda pode subir.`}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Leads e conversão por vendedor" className="lg:col-span-2">
          <div className="flex flex-col gap-3">
            <Pilulas id="ordem" label="Ordenar por" value={ordem} onChange={setOrdem} options={(Object.keys(ORDEM) as Ordem[]).map((k) => [k, ORDEM[k].rotulo])} />
            <p className="text-sm text-muted-foreground">{cfg.pergunta}. Clique em um nome para ver o detalhe.</p>
          </div>
          <div className="-mx-2 overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-[140px_1fr_64px_64px_64px_72px] gap-3 px-2 pb-2 text-xs text-muted-foreground">
                <span>Vendedor</span>
                <span>{cfg.rotulo}</span>
                <span className="text-right">Recebidos</span>
                <span className="text-right">Realizadas</span>
                <span className="text-right">Ganhos</span>
                <span className="text-right">Conversão</span>
              </div>
              <div className="flex flex-col gap-0.5">
                {ranking.map((l, i) => {
                  const v = cfg.valor(l);
                  const ativo = l.nome === sel?.nome;
                  const baixa = l.recebidos >= 3 && time.conversao !== null && (l.conversao ?? 0) < time.conversao / 2;
                  return (
                    <motion.button
                      key={l.nome}
                      layout="position"
                      transition={SPRING}
                      type="button"
                      onClick={() => selecionar(l.nome)}
                      className={cn('grid grid-cols-[140px_1fr_64px_64px_64px_72px] items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors', ativo ? 'bg-muted' : 'hover:bg-muted/60')}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <NameAvatar nome={l.nome} size={24} />
                        <span className={cn('truncate', ativo && 'font-medium')}>{l.nome}</span>
                      </span>
                      <span className="relative h-2.5 rounded-full bg-track">
                        <motion.span
                          className={cn('absolute inset-y-0 left-0 rounded-full', ordem === 'conversao' && baixa ? 'bg-primary' : 'bg-ink')}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (v / maxV) * 100)}%` }}
                          transition={{ duration: 0.7, ease: EASE, delay: 0.05 + i * 0.03 }}
                        />
                        {marcaTime !== null && <span aria-hidden="true" className="absolute -inset-y-1.5 w-px border-l border-dashed border-ink/50" style={{ left: `${Math.min(100, marcaTime)}%` }} />}
                      </span>
                      <span className={cn('num text-right', ordem === 'recebidos' && 'font-medium')}>{l.recebidos}</span>
                      <span className="num text-right text-muted-foreground">{l.realizadas}</span>
                      <span className={cn('num text-right', ordem === 'ganhos' && 'font-medium')}>{l.ganhos}</span>
                      <span className={cn('num text-right', ordem === 'conversao' && 'font-medium', baixa && 'text-primary')}>{fmtPct(l.conversao)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 border-l border-dashed border-ink/60" /> média do time{' '}
              {ordem === 'conversao' ? fmtPct(time.conversao) : ordem === 'recebidos' ? `${fmtNum(mediaRecebidos, 1)} leads` : `${fmtNum(linhas.length ? time.ganhos / linhas.length : null, 1)} ganhos`}
            </span>
            <span>Em rosa: conversão abaixo da metade da média do time (com 3 leads ou mais).</span>
          </div>
        </Bloco>

        {sel && <Detalhe l={sel} time={time} anterior={ant.get(sel.nome) ?? null} />}
      </div>

      {sel && (
        <Bloco titulo={`Leads de ${sel.nome} em ${nomeMes}`}>
          <TabelaLeads itens={leads.filter((l) => l.vendedor === sel.nome).sort((a, b) => b.t - a.t)} semVendedor limite={15} />
        </Bloco>
      )}
    </Page>
  );
}

function Detalhe({ l, time, anterior }: { l: LinhaVendedorP; time: ReturnType<typeof resumir>; anterior: LinhaVendedorP | null }) {
  const { meses, leadsDoMes, mes, anterior: mesAnt } = usePlanilha();
  const historico = useMemo(() => {
    const ate = meses.findIndex((m) => m.chave === mes.chave);
    return meses.slice(Math.max(0, ate - 5), ate + 1).map((m) => {
      const r = resumir(leadsDoMes(m.chave).filter((x) => x.vendedor === l.nome));
      return { m, r };
    });
  }, [meses, leadsDoMes, mes.chave, l.nome]);
  const maxH = Math.max(1, ...historico.map((h) => h.r.recebidos));

  const numeros: [string, string, string, boolean][] = [
    ['Leads recebidos', String(l.recebidos), anterior ? `${nomeCurto(mesAnt!.mes)}: ${anterior.recebidos}` : `${nomeCurto(mesAnt?.mes ?? mes)}: 0`, false],
    ['Conversão', fmtPct(l.conversao), `time ${fmtPct(time.conversao)}`, l.recebidos >= 3 && time.conversao !== null && (l.conversao ?? 0) < time.conversao / 2],
    ['Reuniões realizadas', `${l.realizadas} de ${l.recebidos}`, `comparecimento ${fmtPct(l.comparecimento)}`, false],
    ['Ganhos', String(l.ganhos), `${l.abertos} em aberto · ${l.perdidos} perdidos`, false],
  ];

  return (
    <Bloco titulo="Detalhe">
      <div className="flex items-center gap-3">
        <NameAvatar nome={l.nome} size={44} />
        <div className="flex flex-col">
          <span className="display text-2xl">{l.nome}</span>
          <span className="text-sm text-muted-foreground">{mes.nome}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border">
        {numeros.map(([rot, v, ctx, mal]) => (
          <div key={rot} className="flex flex-col gap-1 bg-card p-3.5">
            <span className="text-xs text-muted-foreground">{rot}</span>
            <span className={cn('num text-2xl font-medium tracking-tight', mal && 'text-primary')}>{v}</span>
            <span className="text-xs text-muted-foreground">{ctx}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Últimos meses · leads recebidos e ganhos</span>
        <div className="grid h-36 grid-flow-col items-end gap-2" style={{ gridTemplateColumns: `repeat(${historico.length}, minmax(0, 1fr))` }}>
          {historico.map(({ m, r }, i) => (
            <div key={m.chave} className="flex h-full flex-col items-center justify-end gap-1" title={`${m.nome}: ${r.recebidos} recebidos, ${r.ganhos} ganhos (${fmtPct(r.conversao)})`}>
              <span className="num text-[11px] text-muted-foreground">{fmtPct(r.conversao)}</span>
              <div className="relative w-full flex-1">
                <motion.div
                  className={cn('absolute inset-x-0 bottom-0 rounded-md', m.chave === mes.chave ? 'bg-ink/25' : 'bg-track')}
                  initial={{ height: 0 }}
                  animate={{ height: `${(r.recebidos / maxH) * 100}%` }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.05 }}
                />
                <motion.div
                  className="absolute inset-x-1.5 bottom-0 rounded-t-[3px] bg-ink"
                  initial={{ height: 0 }}
                  animate={{ height: `${(r.ganhos / maxH) * 100}%` }}
                  transition={{ duration: 0.6, ease: EASE, delay: 0.2 + i * 0.05 }}
                />
              </div>
              <span className={cn('text-[11px]', m.chave === mes.chave ? 'font-medium' : 'text-muted-foreground')}>{m.nome.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <Contexto className="text-muted-foreground opacity-100" itens={['barra clara: recebidos', 'barra escura: ganhos', 'número: conversão']} />
      </div>
    </Bloco>
  );
}
