/** Gráficos simples, desenhados à mão, com cores do tema e animação de entrada. */
import { motion } from 'motion/react';
import { useId } from 'react';
import { EASE } from './motion';

export function Sparkline({ values, height = 36 }: { values: number[]; height?: number }) {
  const id = useId();
  if (values.length < 2) return <div style={{ height }} />;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const r = mx - mn || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 200, 32 - ((v - mn) / r) * 26] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 200 36" preserveAspectRatio="none" width="100%" height={height} aria-hidden="true" className="block overflow-visible">
      <defs>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.16" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={`${d} L200 36 L0 36 Z`}
        fill={`url(#s${id})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
      />
    </svg>
  );
}

/** Meia-lua da meta do mês. `pct` pode passar de 100. */
export function Gauge({ pct, label }: { pct: number; label: string }) {
  const f = Math.max(0, Math.min(pct / 100, 1));
  return (
    <svg viewBox="0 0 220 124" width="100%" className="mx-auto block max-w-[320px]" role="img" aria-label={label}>
      <path d="M20 112 A90 90 0 0 1 200 112" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
      <motion.path
        d="M20 112 A90 90 0 0 1 200 112"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="14"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: f }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.15 }}
      />
    </svg>
  );
}

export function Ring({ pct, size = 140, label }: { pct: number; size?: number; label: string }) {
  const f = Math.max(0, Math.min(pct / 100, 1));
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={label} className="-rotate-90">
      <circle cx="60" cy="60" r="50" fill="none" stroke="var(--muted)" strokeWidth="10" />
      <motion.circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="10"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: f }}
        transition={{ duration: 1, ease: EASE, delay: 0.15 }}
      />
    </svg>
  );
}

export interface Coluna {
  rotulo: string;
  dica: string;
  partes: { valor: number; cor: string }[];
  destaque?: boolean;
}

/** Colunas empilhadas (leads por dia, dentro e fora do prazo). */
export function StackedColumns({ cols, altura = 180, ariaLabel }: { cols: Coluna[]; altura?: number; ariaLabel: string }) {
  const m = Math.max(1, ...cols.map((c) => c.partes.reduce((s, p) => s + p.valor, 0)));
  const passo = m > 12 ? 5 : m > 6 ? 2 : 1;
  const linhas: number[] = [];
  for (let v = passo; v <= m; v += passo) linhas.push(v);
  return (
    <div>
      <div className="relative pl-7" style={{ height: altura }}>
        {linhas.map((v) => (
          <div key={v} aria-hidden="true">
            <div className="absolute right-0 left-7 border-t border-dashed border-border" style={{ bottom: (v / m) * altura }} />
            <span className="absolute left-0 text-[11px] text-muted-foreground" style={{ bottom: (v / m) * altura - 7 }}>
              {v}
            </span>
          </div>
        ))}
        <div role="img" aria-label={ariaLabel} className="relative flex h-full items-end gap-1.5 border-b border-border sm:gap-2">
          {cols.map((c, i) => (
            <div key={i} title={c.dica} className="flex h-full min-w-0 flex-1 flex-col-reverse gap-[3px]">
              {c.partes.map((p, j) =>
                p.valor > 0 ? (
                  <motion.div
                    key={j}
                    className="rounded-[4px]"
                    style={{ background: p.cor, transformOrigin: 'bottom' }}
                    initial={{ height: 0 }}
                    animate={{ height: (p.valor / m) * altura - 3 }}
                    transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.025 }}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-1.5 pl-7 sm:gap-2">
        {cols.map((c, i) => (
          <span key={i} className={`min-w-0 flex-1 truncate text-center text-[10.5px] ${c.destaque ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {c.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
