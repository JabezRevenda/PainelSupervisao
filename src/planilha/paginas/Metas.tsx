import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Bloco, Contexto, fmtNum, fmtPct, Hl, Intro, Medidor, NameAvatar, Numero } from '@/components/kit';
import { EASE, Page, Stagger } from '@/components/motion';
import { cn } from '@/lib/utils';
import { nomeCurto, usePlanilha } from '../estado';
import { metaDoMes, porVendedor } from '../modelo';

export function MetasP() {
  const { mes, meses, leads, anterior, agora, metaPadrao, leadsDoMes } = usePlanilha();
  const d = useMemo(() => {
    const meta = metaDoMes(mes, leads, anterior, agora, metaPadrao);
    const [ano, m] = mes.chave.split('-').map(Number);
    const tri = Math.floor((m - 1) / 3);
    const chavesTri = [0, 1, 2].map((k) => `${ano}-${String(tri * 3 + k + 1).padStart(2, '0')}`);
    let ganhosTri = 0;
    let metaTri = 0;
    let metaCompleta = true;
    for (const c of chavesTri) {
      const mm = meses.find((x) => x.chave === c);
      ganhosTri += leadsDoMes(c).filter((l) => l.resultado === 'ganho').length;
      const alvo = mm?.meta ?? (c > mes.chave ? metaPadrao : null);
      if (alvo === null) metaCompleta = false;
      metaTri += alvo ?? 0;
    }
    const historico = meses.map((x) => ({ m: x, ganhos: leadsDoMes(x.chave).filter((l) => l.resultado === 'ganho').length }));
    const vend = porVendedor(leads).filter((v) => v.ganhos > 0 || v.recebidos >= 3).sort((a, b) => b.ganhos - a.ganhos || b.recebidos - a.recebidos);
    return { meta, tri: { n: tri + 1, ganhos: ganhosTri, meta: metaCompleta ? metaTri : null, chaves: chavesTri }, historico, vend };
  }, [mes, meses, leads, anterior, agora, metaPadrao, leadsDoMes]);
  const { meta, tri, historico, vend } = d;
  const nomeMes = nomeCurto(mes);
  const esperado = meta.diasTotal ? (meta.diasPassados / meta.diasTotal) * 100 : 0;
  const maxH = Math.max(1, ...historico.map((h) => Math.max(h.ganhos, h.m.meta ?? 0)));
  const maxV = Math.max(1, ...vend.map((v) => v.ganhos));
  const futuros = tri.chaves.filter((c) => !meses.some((m) => m.chave === c));

  return (
    <Page className="gap-8">
      <Intro
        tag={`Metas · ${nomeMes} e ${tri.n}º trimestre`}
        title={
          meta.meta === null ? (
            <>
              Em {nomeMes} foram <Hl>{meta.ganhos} ganhos</Hl>. A planilha não tem meta de ganhos para este mês.
            </>
          ) : meta.corrente ? (
            meta.faltam! > 0 ? (
              <>
                Faltam <Hl>{meta.faltam} ganhos</Hl> para a meta de {meta.meta}. No ritmo atual, chegamos a {meta.projecao}.
              </>
            ) : (
              <>
                Meta de {nomeMes} batida: <Hl>{meta.ganhos} ganhos</Hl> de {meta.meta}.
              </>
            )
          ) : (
            <>
              {nomeMes[0].toUpperCase() + nomeMes.slice(1)} fechou com <Hl>{meta.ganhos} ganhos</Hl>, {fmtPct((meta.ganhos / meta.meta) * 100)} da meta de {meta.meta}.
            </>
          )
        }
        aside={
          meta.corrente && meta.meta !== null ? (
            <>
              Para bater, o time precisa de {fmtNum(meta.ritmoNecessario, 1)} ganhos por dia útil nos {Math.round(meta.diasRestantes)} dias que faltam. Hoje o ritmo é de{' '}
              {fmtNum(meta.ritmoAtual, 1)} por dia útil.
            </>
          ) : (
            'Ganho = status Ganho ou Cadastrado na planilha (o "Concluídos"). Conta no mês em que o lead foi agendado.'
          )
        }
      />

      <Stagger className="grid gap-4 md:grid-cols-3">
        <Bloco tom="ink" onda titulo={`Ganhos de ${nomeMes}`}>
          <Numero value={meta.ganhos} unidade={meta.meta ? `de ${meta.meta}` : 'ganhos'} />
          <Medidor tom="ink" pct={meta.meta ? (meta.ganhos / meta.meta) * 100 : null} marca={meta.corrente ? esperado : null} />
          <Contexto
            className="mt-auto"
            itens={
              meta.corrente
                ? [`projeção ${meta.projecao}`, `onde deveríamos estar hoje: ${Math.round(((meta.meta ?? 0) * esperado) / 100)}`]
                : [anterior ? `${nomeCurto(anterior.mes)}: ${anterior.ls.filter((l) => l.resultado === 'ganho').length}` : null, 'mês fechado']
            }
          />
        </Bloco>
        <Bloco titulo="Ritmo por dia útil">
          <Numero value={meta.ritmoAtual} format={(v) => fmtNum(v, 1)} unidade="ganhos por dia" className={cn(meta.ritmoNecessario !== null && (meta.ritmoAtual ?? 0) < meta.ritmoNecessario && 'text-primary')} />
          <Contexto
            className="mt-auto text-muted-foreground opacity-100"
            itens={[meta.ritmoNecessario !== null ? `necessário ${fmtNum(meta.ritmoNecessario, 1)}` : 'sem ritmo necessário', `${fmtNum(meta.diasPassados, 1)} de ${meta.diasTotal} dias úteis`]}
          />
        </Bloco>
        <Bloco titulo={`${tri.n}º trimestre`}>
          <Numero value={tri.ganhos} unidade={tri.meta ? `de ${tri.meta} ganhos` : 'ganhos'} />
          <Medidor pct={tri.meta ? (tri.ganhos / tri.meta) * 100 : null} />
          <Contexto
            className="mt-auto text-muted-foreground opacity-100"
            itens={[
              tri.meta ? `${fmtPct((tri.ganhos / tri.meta) * 100)} da meta` : 'meta do trimestre incompleta na planilha',
              futuros.length > 0 && metaPadrao !== null && `${futuros.length === 1 ? 'o mês que falta usa' : 'os meses que faltam usam'} a meta de ${metaPadrao}`,
            ]}
          />
        </Bloco>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Bloco titulo="Ganhos mês a mês" className="lg:col-span-2">
          <div className="grid h-56 items-end gap-2" style={{ gridTemplateColumns: `repeat(${historico.length}, minmax(0, 1fr))` }}>
            {historico.map(({ m, ganhos }, i) => (
              <div key={m.chave} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className={cn('num text-xs', m.chave === mes.chave ? 'font-medium' : 'text-muted-foreground')}>{ganhos}</span>
                <div className="relative w-full flex-1">
                  <motion.div
                    className={cn('absolute inset-x-0 bottom-0 rounded-md', m.chave === mes.chave ? 'bg-ink' : 'bg-ink/25')}
                    initial={{ height: 0 }}
                    animate={{ height: `${(ganhos / maxH) * 100}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.1 + i * 0.04 }}
                  />
                  {m.meta !== null && <span aria-hidden="true" className="absolute -inset-x-0.5 h-0.5 rounded-full bg-primary" style={{ bottom: `${(m.meta / maxH) * 100}%` }} title={`meta ${m.meta}`} />}
                </div>
                <span className={cn('text-[11px]', m.chave === mes.chave ? 'font-medium' : 'text-muted-foreground')}>{m.nome.slice(0, 3)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-primary" /> meta de ganhos (a planilha tem meta de ganhos a partir de agosto)
            </span>
          </div>
        </Bloco>

        <Bloco titulo={`Quem fez os ganhos de ${nomeMes}`}>
          <ul className="flex flex-col gap-3">
            {vend.map((v, i) => (
              <li key={v.nome} className="grid grid-cols-[120px_1fr_28px] items-center gap-3 text-sm">
                <span className="flex items-center gap-2 truncate">
                  <NameAvatar nome={v.nome} size={22} />
                  {v.nome}
                </span>
                <span className="h-2 rounded-full bg-track">
                  <motion.span
                    className="block h-full rounded-full bg-ink"
                    initial={{ width: 0 }}
                    animate={{ width: `${(v.ganhos / maxV) * 100}%` }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.04 }}
                  />
                </span>
                <span className="num text-right font-medium">{v.ganhos}</span>
              </li>
            ))}
            {vend.length === 0 && <li className="text-sm text-muted-foreground">Nenhum ganho ainda.</li>}
          </ul>
          <Contexto className="text-muted-foreground opacity-100" itens={['a planilha não tem meta por vendedor']} />
        </Bloco>
      </div>
    </Page>
  );
}
