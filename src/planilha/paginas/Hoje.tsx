import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLink, Bloco, Chip, Contexto, Cta, fmtPct, Hl, Intro, Medidor, NameAvatar, Numero } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { fmtLongDate, minutesOfDay } from '@/data/time';
import { cn } from '@/lib/utils';
import { nomeCurto, usePlanilha } from '../estado';
import { type Equipe, EQUIPE_LABEL, equipeDe, funilDoMes, metaDoMes, porVendedor, resumir } from '../modelo';
import { AvisoPlanilha } from '../pecas';

function saudacao(agora: number) {
  const m = minutesOfDay(agora);
  return m < 12 * 60 ? 'Bom dia' : m < 18 * 60 ? 'Boa tarde' : 'Boa noite';
}

function contarPor(ls: { vendedor: string }[]) {
  const m = new Map<string, number>();
  for (const l of ls) m.set(l.vendedor, (m.get(l.vendedor) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export function Hoje() {
  const { mes, leads, anterior, agora, metaPadrao } = usePlanilha();
  const navigate = useNavigate();
  const d = useMemo(() => {
    const r = resumir(leads);
    const rAnt = anterior ? resumir(anterior.ls) : null;
    const semDesfecho = contarPor(leads.filter((l) => l.realizada === 'pendente' && l.resultado === 'aberto'));
    const faltas = contarPor(leads.filter((l) => l.realizada === 'nao' && l.resultado === 'aberto'));
    return { r, rAnt, semDesfecho, faltas, vend: porVendedor(leads), funil: funilDoMes(mes, leads), meta: metaDoMes(mes, leads, anterior, agora, metaPadrao) };
  }, [leads, anterior, mes, agora, metaPadrao]);
  const { r, rAnt, semDesfecho, faltas, vend, funil, meta } = d;
  const nSem = semDesfecho.reduce((s, x) => s + x[1], 0);
  const nFaltas = faltas.reduce((s, x) => s + x[1], 0);
  const nomeMes = nomeCurto(mes);
  const esperado = meta.diasTotal ? (meta.diasPassados / meta.diasTotal) * 100 : 0;
  const convTime = r.conversao;
  const maxRec = Math.max(1, ...vend.map((v) => v.recebidos));
  const grupos = (['interno', 'externo'] as Equipe[])
    .map((e) => ({ e, linhas: vend.filter((v) => equipeDe(v.nome) === e), r: resumir(leads.filter((l) => l.equipe === e)) }))
    .filter((g) => g.linhas.length > 0);

  return (
    <Page className="gap-8">
      <Intro
        tag={`Hoje · ${fmtLongDate(agora)}`}
        title={
          nSem > 0 ? (
            <>
              {saudacao(agora)}. <Hl>{nSem} {nSem === 1 ? 'reunião' : 'reuniões'}</Hl> de {nomeMes} {nSem === 1 ? 'está' : 'estão'} sem desfecho.
            </>
          ) : (
            <>
              {saudacao(agora)}. Todas as reuniões de {nomeMes} têm desfecho.
            </>
          )
        }
        aside={
          <>
            Estão como Pendente na planilha: ninguém marcou se a reunião aconteceu. {nFaltas > 0 ? `Outros ${nFaltas} leads não compareceram e ainda precisam de nova data.` : ''}
          </>
        }
        action={<Cta to="/pendencias">Ver pendências</Cta>}
      />

      <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Bloco tom={nSem > 0 ? 'pink' : 'white'} onda={nSem > 0} titulo="Reuniões sem desfecho" acao={<ArrowLink to="/pendencias" label="Ver pendências" tom={nSem > 0 ? 'pink' : 'white'} />}>
          <Numero value={nSem} unidade={nSem === 1 ? 'reunião' : 'reuniões'} />
          <div className="flex flex-wrap gap-1.5">
            {semDesfecho.slice(0, 4).map(([n, q]) => (
              <Chip key={n}>
                {n} · {q}
              </Chip>
            ))}
          </div>
          <Contexto className="mt-auto" itens={['marcadas como Pendente', `${nomeMes}`]} />
        </Bloco>

        <Bloco titulo="Não compareceram" acao={<ArrowLink to="/reunioes" label="Ver reuniões" />}>
          <Numero value={nFaltas} unidade="sem nova data" />
          <div className="flex flex-wrap gap-1.5">
            {faltas.slice(0, 4).map(([n, q]) => (
              <Chip key={n}>
                {n} · {q}
              </Chip>
            ))}
            {faltas.length === 0 && <Chip>Nenhum</Chip>}
          </div>
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={[`${r.naoCompareceram} faltas no mês`, 'ainda em acompanhamento']} />
        </Bloco>

        <Bloco titulo="Reuniões realizadas" acao={<ArrowLink to="/reunioes" label="Abrir reuniões" />}>
          <Numero value={r.realizadas} unidade={`de ${r.recebidos} agendadas`} />
          <Medidor pct={r.realizacao} />
          <Contexto
            className="mt-auto text-muted-foreground opacity-100"
            itens={[`comparecimento ${fmtPct(r.comparecimento)}`, rAnt && `${nomeCurto(anterior!.mes)}: ${fmtPct(rAnt.comparecimento)}`]}
          />
        </Bloco>

        <Bloco tom="ink" onda titulo={`Meta de ${nomeMes}`} acao={<ArrowLink to="/metas" label="Ver metas" tom="ink" />}>
          <Numero value={meta.ganhos} unidade={meta.meta ? `de ${meta.meta} ganhos` : 'ganhos'} />
          <Medidor tom="ink" pct={meta.meta ? (meta.ganhos / meta.meta) * 100 : null} marca={meta.corrente ? esperado : null} />
          <Contexto
            className="mt-auto"
            itens={
              meta.corrente
                ? [`projeção ${meta.projecao}`, meta.faltam !== null && `faltam ${meta.faltam} em ${Math.round(meta.diasRestantes)} dias úteis`]
                : [meta.meta ? `${fmtPct((meta.ganhos / meta.meta) * 100)} da meta` : 'sem meta de ganhos na planilha', 'mês fechado']
            }
          />
        </Bloco>
      </Stagger>

      <Stagger className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo={`Vendedores em ${nomeMes}`} acao={<ArrowLink to="/time" label="Abrir Time" />} className="lg:col-span-2">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-2 pb-2 font-normal">Vendedor</th>
                  <th className="w-[26%] px-2 pb-2 font-normal">Leads recebidos</th>
                  <th className="px-2 pb-2 text-right font-normal">Realizadas</th>
                  <th className="px-2 pb-2 text-right font-normal">Ganhos</th>
                  <th className="px-2 pb-2 text-right font-normal">Conversão</th>
                </tr>
              </thead>
              {grupos.map((g, gi) => (
                <tbody key={g.e}>
                  <tr className={cn('bg-muted/60 text-xs', gi > 0 && 'border-t-8 border-card')}>
                    <td className="rounded-l-lg px-2 py-2 font-medium tracking-wide uppercase">
                      {EQUIPE_LABEL[g.e]} · {g.linhas.length}
                    </td>
                    <td className="num px-2 font-medium">{g.r.recebidos} leads</td>
                    <td className="num px-2 text-right">{g.r.realizadas}</td>
                    <td className="num px-2 text-right">{g.r.ganhos}</td>
                    <td className="num rounded-r-lg px-2 text-right font-medium">{fmtPct(g.r.conversao)}</td>
                  </tr>
                {g.linhas.map((v, i) => (
                    <motion.tr
                      key={v.nome}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE, delay: 0.2 + i * 0.03 }}
                      onClick={() => navigate(`/time?v=${encodeURIComponent(v.nome)}`)}
                      className="cursor-pointer border-t transition-colors hover:bg-muted/60"
                    >
                      <td className="px-2 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <NameAvatar nome={v.nome} size={28} />
                          <span className="font-medium">{v.nome}</span>
                        </span>
                      </td>
                      <td className="px-2">
                        <span className="flex items-center gap-3">
                          <Medidor pct={(v.recebidos / maxRec) * 100} delay={0.25 + i * 0.03} className="h-1.5" />
                          <span className="num w-6 text-right font-medium">{v.recebidos}</span>
                        </span>
                      </td>
                      <td className="num px-2 text-right text-muted-foreground">{v.realizadas}</td>
                      <td className="num px-2 text-right">{v.ganhos}</td>
                      <td className={cn('num px-2 text-right font-medium', v.recebidos >= 3 && convTime !== null && (v.conversao ?? 0) < convTime / 2 && 'text-primary')}>{fmtPct(v.conversao)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Conversão = ganhos ÷ leads recebidos. Time: {fmtPct(convTime)}. Clique em um vendedor para ver o detalhe.
          </p>
        </Bloco>

        <Bloco titulo={`Funil de ${nomeMes}`} acao={<ArrowLink to="/funil" label="Abrir funil" />}>
          <ol className="flex flex-col gap-3">
            {funil.map((p, i) => (
              <li key={p.chave} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{p.rotulo}</span>
                  <span className="num text-lg font-medium">{p.n}</span>
                </div>
                <Medidor pct={funil[0].n ? (p.n / funil[0].n) * 100 : 0} delay={0.2 + i * 0.08} className="h-1.5" />
                {i > 0 && <span className="text-xs text-muted-foreground">{fmtPct(p.conversao)} da etapa anterior</span>}
              </li>
            ))}
          </ol>
          <div className="flex items-baseline justify-between gap-3 border-t pt-3 text-sm">
            <span className="text-muted-foreground">Conversão do funil · leads recebidos → ganhos</span>
            <span className="num text-lg font-medium">{fmtPct(funil[0].n ? (funil[3].n / funil[0].n) * 100 : null, 1)}</span>
          </div>
        </Bloco>
      </Stagger>

      <AvisoPlanilha>
        Esta versão lê a planilha de follow-up. Ela não registra os contatos com o lead, então leads parados, sem primeiro contato e o prazo de 1 hora aparecem quando o painel ler
        o CRM.
      </AvisoPlanilha>
    </Page>
  );
}
