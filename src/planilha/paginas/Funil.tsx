import { motion } from 'motion/react';
import { type ReactNode, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Bloco, Contexto, fmtNum, fmtPct, Hl, Intro, Numero, Pilulas } from '@/components/kit';
import { AnimatedNumber, EASE, Page, Stagger } from '@/components/motion';
import { cn } from '@/lib/utils';
import { nomeCurto, usePlanilha } from '../estado';
import { conversaoNaMesmaIdade, conversaoPorIdade, type Equipe, EQUIPE_LABEL, fmtDia, funilDoMes, idadeDias, pct, porCanal, resumir, temDataGanho } from '../modelo';
import { OrigemP } from '../pecas';

type Aba = 'etapas' | 'idade' | 'origem';
type FiltroEquipe = Equipe | 'todos';

export function FunilP() {
  const { aba } = useParams();
  const navigate = useNavigate();
  if (aba !== 'etapas' && aba !== 'idade' && aba !== 'origem') return <Navigate to="/funil/etapas" replace />;
  const topo = (
    <Pilulas
      id="aba-funil"
      label="Análise"
      value={aba as Aba}
      onChange={(a) => navigate(`/funil/${a}`)}
      options={[
        ['etapas', 'Funil'],
        ['idade', 'Idade do lead'],
        ['origem', 'Origem do lead'],
      ]}
    />
  );
  return aba === 'etapas' ? <Etapas topo={topo} /> : aba === 'idade' ? <Idade topo={topo} /> : <Origem topo={topo} />;
}

function Etapas({ topo }: { topo: ReactNode }) {
  const { mes, leads, anterior, meses, leadsDoMes, dados } = usePlanilha();
  const d = useMemo(() => {
    const etapas = funilDoMes(mes, leads);
    const ant = anterior ? funilDoMes(anterior.mes, anterior.ls) : null;
    const historico = meses.map((m) => ({ m, f: funilDoMes(m, leadsDoMes(m.chave)) }));
    return { etapas, ant, historico, r: resumir(leads) };
  }, [mes, leads, anterior, meses, leadsDoMes]);
  const { etapas, ant, historico, r } = d;
  const base = etapas[0].n || 1;
  const transicoes = etapas.slice(1);
  const pior = [...transicoes].sort((a, b) => (a.conversao ?? 100) - (b.conversao ?? 100))[0];
  const idxPior = etapas.indexOf(pior);
  const nomeMes = nomeCurto(mes);
  const ultimoDiaMes = leads.reduce((mx, l) => (l.data && l.data > mx ? l.data : mx), '');
  const leadsIncompletos = mes.leadsAte && ultimoDiaMes && mes.leadsAte < ultimoDiaMes;
  const convTotal = pct(etapas[3].n, etapas[0].n);
  const convTotalAnt = ant ? pct(ant[3].n, ant[0].n) : null;

  return (
    <Page className="gap-8">
      <Intro
        top={topo}
        tag={`Funil · ${mes.nome.toLowerCase()}`}
        title={
          <>
            De {etapas[0].n} leads recebidos, {etapas[3].n} viraram ganho: <Hl>{fmtPct(convTotal, 1)} de conversão</Hl> no funil.
          </>
        }
        aside={
          <>
            A maior perda é entre {etapas[idxPior - 1].rotulo.toLowerCase()} e {pior.rotulo.toLowerCase()}: {fmtPct(100 - (pior.conversao ?? 0))} não passam. {r.abertos > 0 && `${r.abertos} leads de ${nomeMes} seguem em acompanhamento e ainda podem virar ganho.`}
          </>
        }
      />

      <Bloco titulo={`Funil de ${nomeMes}`}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-muted px-5 py-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Conversão do funil · leads recebidos → ganhos</span>
            <span className="display num text-[40px] leading-tight">{fmtPct(convTotal, 1)}</span>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className="num text-lg font-medium">{etapas[0].n}</span> leads recebidos
            <span className="text-muted-foreground">→</span>
            <span className="num text-lg font-medium">{etapas[3].n}</span> ganhos
          </div>
          {convTotalAnt !== null && (
            <span className="text-sm text-muted-foreground lg:ml-auto">
              {nomeCurto(anterior!.mes)}: {fmtPct(convTotalAnt, 1)} ({ant![0].n} → {ant![3].n})
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">A largura de cada faixa é proporcional ao número de leads que chegou à etapa.</p>
        <div className="flex flex-col gap-1.5">
          {etapas.map((e, i) => {
            const topoPct = (e.n / base) * 100;
            const prox = etapas[i + 1];
            const baixoPct = prox ? (prox.n / base) * 100 : topoPct * 0.72;
            const it = (100 - topoPct) / 2;
            const ib = (100 - baixoPct) / 2;
            const destaque = i === idxPior - 1;
            const a = prox && ant ? ant[i + 1] : null;
            const dif = prox && a && prox.conversao !== null && a.conversao !== null ? prox.conversao - a.conversao : null;
            return (
              <div key={e.chave} className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-center gap-x-4 md:gap-x-10">
                <motion.div
                  className={cn('flex min-h-20 items-center justify-center self-stretch', destaque ? 'bg-primary text-white' : 'bg-ink text-ink-foreground')}
                  initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)' }}
                  animate={{ clipPath: `polygon(${it}% 0%, ${100 - it}% 0%, ${100 - ib}% 100%, ${ib}% 100%)` }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.14 }}
                >
                  <span className="display num text-3xl max-md:hidden">
                    <AnimatedNumber value={e.n} />
                  </span>
                </motion.div>
                <div className="flex flex-col gap-1">
                  <span className="eyebrow">{e.rotulo}</span>
                  <span className="text-sm text-muted-foreground">
                    <span className="num font-medium text-foreground md:hidden">{e.n} · </span>
                    {i === 0 ? e.ajuda : `${fmtPct(topoPct)} dos leads · ${e.ajuda}`}
                  </span>
                  {prox && (
                    <span className={cn('text-xs leading-relaxed', destaque ? 'font-medium text-primary' : 'text-muted-foreground')}>
                      ↓ {fmtPct(prox.conversao)} avançam · {e.n - prox.n} ficam
                      {dif !== null && (
                        <>
                          {' '}
                          · {dif >= 0 ? '+' : '−'}
                          {fmtNum(Math.abs(dif), 0)} p.p. vs. {nomeCurto(anterior!.mes)}
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {leadsIncompletos && (
          <p className="text-xs text-muted-foreground">
            Na planilha, os leads do dia a dia estão preenchidos até {fmtDia(mes.leadsAte)} e as reuniões até {fmtDia(ultimoDiaMes)}.
          </p>
        )}
      </Bloco>

      <Stagger className="grid gap-4 md:grid-cols-3">
        <Bloco titulo="Lead recebido → reunião">
          <Numero value={etapas[1].conversao} format={(v) => fmtPct(v)} unidade="viram reunião" />
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={[`${etapas[1].n} de ${etapas[0].n}`, ant && `${nomeCurto(anterior!.mes)}: ${fmtPct(ant[1].conversao)}`]} />
        </Bloco>
        <Bloco titulo="Agendada → realizada">
          <Numero value={etapas[2].conversao} format={(v) => fmtPct(v)} unidade="acontecem" />
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={[`${etapas[2].n} de ${etapas[1].n} agendadas`, ant && `${nomeCurto(anterior!.mes)}: ${fmtPct(ant[2].conversao)}`]} />
        </Bloco>
        <Bloco titulo="Reunião realizada → ganho">
          <Numero value={etapas[3].conversao} format={(v) => fmtPct(v)} unidade="fecham" />
          <Contexto className="mt-auto text-muted-foreground opacity-100" itens={[`${etapas[3].n} de ${etapas[2].n} realizadas`, ant && `${nomeCurto(anterior!.mes)}: ${fmtPct(ant[3].conversao)}`]} />
        </Bloco>
      </Stagger>

      <Bloco titulo="Mês a mês">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 pb-2 font-normal">Mês</th>
                <th className="px-2 pb-2 text-right font-normal">Leads recebidos</th>
                <th className="px-2 pb-2 text-right font-normal">Agendadas</th>
                <th className="px-2 pb-2 text-right font-normal">Realizadas</th>
                <th className="px-2 pb-2 text-right font-normal">Ganhos</th>
                <th className="px-2 pb-2 text-right font-normal">Lead → reunião</th>
                <th className="px-2 pb-2 text-right font-normal">Conversão do funil</th>
              </tr>
            </thead>
            <tbody>
              {[...historico].reverse().map(({ m, f }) => (
                <tr key={m.chave} className={cn('border-t', m.chave === mes.chave && 'bg-muted/70 font-medium')}>
                  <td className="px-2 py-2">{m.nome}</td>
                  {f.map((p) => (
                    <td key={p.chave} className="num px-2 text-right">
                      {p.n}
                    </td>
                  ))}
                  <td className="num px-2 text-right">{fmtPct(f[1].conversao)}</td>
                  <td className="num px-2 text-right font-medium">{fmtPct(pct(f[3].n, f[0].n), 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Contexto className="text-muted-foreground opacity-100" itens={[`planilha “${dados.arquivo}”`, 'ganhos contam no mês em que o lead foi agendado, como na planilha']} />
      </Bloco>
    </Page>
  );
}

function Origem({ topo }: { topo: ReactNode }) {
  const { mes, leads } = usePlanilha();
  const canais = useMemo(() => porCanal(leads), [leads]);
  const time = resumir(leads);
  const comVolume = canais.filter((c) => c.recebidos >= 5);
  const melhor = [...comVolume].sort((a, b) => (b.conversao ?? 0) - (a.conversao ?? 0))[0];
  const maxRec = Math.max(1, ...canais.map((c) => c.recebidos));
  const nomeMes = nomeCurto(mes);

  return (
    <Page className="gap-8">
      <Intro
        top={topo}
        tag={`Origem do lead · ${mes.nome.toLowerCase()}`}
        title={
          melhor ? (
            <>
              <Hl>{melhor.canal}</Hl> é a origem que mais converte em {nomeMes}: {fmtPct(melhor.conversao)} das reuniões viram ganho.
            </>
          ) : (
            <>Reuniões e ganhos de {nomeMes} por origem do lead.</>
          )
        }
        aside={<>A planilha traz a origem só dos leads que viraram reunião. A conversão aqui é ganhos ÷ reuniões agendadas daquela origem. Média do mês: {fmtPct(time.conversao)}.</>}
      />
      <Bloco titulo="Reuniões e conversão por origem">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 pb-2 font-normal">Origem</th>
                <th className="w-[30%] px-2 pb-2 font-normal">Reuniões agendadas</th>
                <th className="px-2 pb-2 text-right font-normal">Realizadas</th>
                <th className="px-2 pb-2 text-right font-normal">Ganhos</th>
                <th className="px-2 pb-2 text-right font-normal">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {canais.map((c, i) => (
                <tr key={c.canal} className="border-t">
                  <td className="px-2 py-2.5">
                    <OrigemP canal={c.canal} className="text-sm text-foreground" />
                  </td>
                  <td className="px-2">
                    <span className="flex items-center gap-3">
                      <span className="h-2 flex-1 rounded-full bg-track">
                        <motion.span
                          className="block h-full rounded-full bg-ink"
                          initial={{ width: 0 }}
                          animate={{ width: `${(c.recebidos / maxRec) * 100}%` }}
                          transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.04 }}
                        />
                      </span>
                      <span className="num w-6 text-right font-medium">{c.recebidos}</span>
                    </span>
                  </td>
                  <td className="num px-2 text-right text-muted-foreground">{c.realizadas}</td>
                  <td className="num px-2 text-right">{c.ganhos}</td>
                  <td className="num px-2 text-right font-medium">{c.recebidos >= 5 ? fmtPct(c.conversao) : <span className="font-normal text-muted-foreground">poucos leads</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Contexto className="text-muted-foreground opacity-100" itens={['conversão só aparece com 5 reuniões ou mais', `${leads.length} reuniões em ${nomeMes}`]} />
      </Bloco>
    </Page>
  );
}

const DIAS_COMPARACAO = 30;

/**
 * Idade do lead: quanto tempo o lead teve para fechar. Mês recente sempre parece
 * pior porque seus leads são novos; esta aba mostra isso e, com a data do ganho
 * na planilha, compara os meses na mesma idade.
 */
function Idade({ topo }: { topo: ReactNode }) {
  const { todos, meses, mes, leadsDoMes, agora } = usePlanilha();
  const [equipe, setEquipe] = useState<FiltroEquipe>('todos');
  const filtra = (ls: typeof todos) => (equipe === 'todos' ? ls : ls.filter((l) => l.equipe === equipe));
  const d = useMemo(() => {
    const base = filtra(todos);
    const faixas = conversaoPorIdade(base, agora);
    const porMes = meses.map((m) => {
      const ls = filtra(leadsDoMes(m.chave)).filter((l) => !l.semData);
      const idades = ls.map((l) => idadeDias(l, agora));
      const r = resumir(ls);
      return { m, r, min: idades.length ? Math.min(...idades) : null, max: idades.length ? Math.max(...idades) : null };
    });
    const comData = temDataGanho(base);
    const mesma = comData ? conversaoNaMesmaIdade(meses, (c) => filtra(leadsDoMes(c)), DIAS_COMPARACAO, agora) : [];
    return { faixas, porMes, comData, mesma };
  }, [todos, meses, leadsDoMes, agora, equipe]); // eslint-disable-line react-hooks/exhaustive-deps
  const { faixas, porMes, comData, mesma } = d;
  const novas = faixas.slice(0, 2);
  const novasLeads = novas.reduce((s, f) => s + f.leads, 0);
  const convNovas = pct(novas.reduce((s, f) => s + f.ganhos, 0), novasLeads);
  const maduras = faixas.filter((f) => f.de > 60);
  const convMaduras = pct(maduras.reduce((s, f) => s + f.ganhos, 0), maduras.reduce((s, f) => s + f.leads, 0));
  const maxConv = Math.max(10, ...faixas.map((f) => f.conversao ?? 0));
  const escala = Math.ceil(maxConv / 10) * 10;
  const atual = porMes.find((x) => x.m.chave === mes.chave);

  return (
    <Page className="gap-8">
      <Intro
        top={topo}
        tag={`Idade do lead · ${equipe === 'todos' ? 'todos os vendedores' : EQUIPE_LABEL[equipe].toLowerCase()} · 2026`}
        title={
          <>
            Lead novo ainda não teve tempo de fechar: com até 15 dias, <Hl>{fmtPct(convNovas)} viram ganho</Hl>. Com mais de 60 dias, {fmtPct(convMaduras)}.
          </>
        }
        aside={
          <>
            Idade = dias desde o agendamento da reunião até hoje.{' '}
            {atual && atual.min !== null && `Os leads de ${nomeCurto(mes)} têm de ${atual.min} a ${atual.max} dias, então a conversão do mês ainda vai subir.`}
          </>
        }
        action={
          <Pilulas
            id="equipe-idade"
            label="Equipe"
            value={equipe}
            onChange={setEquipe}
            options={[
              ['todos', 'Todos'],
              ['interno', 'Internos'],
              ['externo', 'Externos'],
            ]}
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Conversão de hoje por idade do lead" className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {faixas.map((f, i) => (
              <div key={f.rotulo} className="grid grid-cols-[120px_1fr_210px] items-center gap-4 text-sm max-sm:grid-cols-[96px_1fr]">
                <span>{f.rotulo}</span>
                <span className="h-3 rounded-full bg-track">
                  <motion.span
                    className={cn('block h-full rounded-full', f.de <= 15 ? 'bg-ink/35' : 'bg-ink')}
                    initial={{ width: 0 }}
                    animate={{ width: `${((f.conversao ?? 0) / escala) * 100}%` }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.05 }}
                  />
                </span>
                <span className="num text-right max-sm:col-span-2 max-sm:text-left">
                  <span className="font-medium">{fmtPct(f.conversao)}</span>
                  <span className="text-muted-foreground">
                    {' '}
                    · {f.ganhos} de {f.leads}
                    {f.abertos > 0 && ` · ${f.abertos} em aberto`}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <Contexto className="text-muted-foreground opacity-100" itens={[`escala de 0 a ${escala}%`, 'todos os leads de 2026 com data, pelo status de hoje']} />
        </Bloco>

        <Bloco tom={comData ? 'white' : 'ink'} titulo={`Meses na mesma idade · ${DIAS_COMPARACAO} dias`}>
          {comData ? (
            <ul className="flex flex-col gap-2 text-sm">
              {[...mesma].reverse().map((x) => (
                <li key={x.chave} className={cn('flex items-baseline justify-between gap-3', x.chave === mes.chave && 'font-medium')}>
                  <span>{x.nome}</span>
                  <span className="num">
                    {x.completo ? fmtPct(x.conversao, 1) : <span className="text-muted-foreground">ainda sem {DIAS_COMPARACAO} dias</span>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-[15px] leading-relaxed">
                Para comparar os meses de forma justa (quantos leads viram ganho em até {DIAS_COMPARACAO} dias), a planilha precisa da data em que cada lead virou ganho.
              </p>
              <p className="text-sm leading-relaxed opacity-75">
                Basta uma coluna “DATA GANHO” na lista de leads, preenchida no dia em que a venda for registrada, como a saída no controle de estoque. O painel já lê essa coluna
                e este bloco passa a mostrar a comparação.
              </p>
            </>
          )}
        </Bloco>
      </div>

      <Bloco titulo="Mês a mês: idade e conversão até hoje">
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 pb-2 font-normal">Mês</th>
                <th className="px-2 pb-2 text-right font-normal">Idade dos leads</th>
                <th className="px-2 pb-2 text-right font-normal">Leads recebidos</th>
                <th className="px-2 pb-2 text-right font-normal">Ganhos</th>
                <th className="px-2 pb-2 text-right font-normal">Em aberto</th>
                <th className="px-2 pb-2 text-right font-normal">Conversão até hoje</th>
              </tr>
            </thead>
            <tbody>
              {[...porMes].reverse().map(({ m, r, min, max }) => (
                <tr key={m.chave} className={cn('border-t', m.chave === mes.chave && 'bg-muted/70 font-medium')}>
                  <td className="px-2 py-2">{m.nome}</td>
                  <td className="num px-2 text-right text-muted-foreground">{min === null ? '—' : `${min} a ${max} dias`}</td>
                  <td className="num px-2 text-right">{r.recebidos}</td>
                  <td className="num px-2 text-right">{r.ganhos}</td>
                  <td className="num px-2 text-right">{r.abertos}</td>
                  <td className="num px-2 text-right font-medium">{fmtPct(r.conversao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Contexto className="text-muted-foreground opacity-100" itens={['conversão = ganhos ÷ leads recebidos pelos vendedores', 'quanto mais leads em aberto, mais o mês ainda pode subir']} />
      </Bloco>
    </Page>
  );
}
