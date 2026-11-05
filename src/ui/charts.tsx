import { useId } from 'react';

/** Linha com área, sem eixos (cartões de KPI). */
export function Sparkline({ values, height = 40 }: { values: number[]; height?: number }) {
  const id = useId();
  if (values.length < 2) return <div style={{ height }} />;
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  const r = mx - mn || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 200).toFixed(1)},${(34 - ((v - mn) / r) * 28).toFixed(1)}`).join(' ');
  return (
    <svg viewBox="0 0 200 40" preserveAspectRatio="none" width="100%" height={height} aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sp${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6234E" stopOpacity="0.35" />
          <stop offset="1" stopColor="#E6234E" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,40 ${pts} 200,40`} fill={`url(#sp${id})`} />
      <polyline points={pts} fill="none" stroke="#E6234E" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Medidor em arco (meta do mês). `pct` pode passar de 100. */
export function Gauge({ pct, label }: { pct: number; label: string }) {
  const id = useId();
  const f = Math.max(0, Math.min(pct / 100, 1));
  const len = Math.PI * 120;
  const ang = Math.PI * (1 - f);
  const kx = 150 + 120 * Math.cos(ang);
  const ky = 150 - 120 * Math.sin(ang);
  return (
    <svg viewBox="0 0 300 172" width="100%" style={{ display: 'block', maxWidth: 360, margin: '0 auto', overflow: 'visible' }} role="img" aria-label={label}>
      <defs>
        <filter id={`g${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`a${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E6234E" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FF6B8A" />
        </linearGradient>
      </defs>
      <path d="M30 150 A120 120 0 0 1 270 150" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="16" strokeLinecap="round" />
      {f > 0 && (
        <path
          d="M30 150 A120 120 0 0 1 270 150"
          fill="none"
          stroke={`url(#a${id})`}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(len * f).toFixed(1)} ${len + 40}`}
          filter={`url(#g${id})`}
        />
      )}
      <circle cx={kx} cy={ky} r="13" fill="#141218" stroke="#FF6B8A" strokeWidth="4" filter={`url(#g${id})`} />
    </svg>
  );
}

/** Anel de porcentagem. */
export function Donut({ pct, size = 170, label }: { pct: number; size?: number; label: string }) {
  const id = useId();
  const c = 2 * Math.PI * 54;
  const f = Math.max(0, Math.min(pct / 100, 1));
  return (
    <svg viewBox="0 0 140 140" width={size} height={size} role="img" aria-label={label} style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`d${id}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="70" cy="70" r="54" fill="none" stroke="var(--track)" strokeWidth="14" />
      <circle
        cx="70"
        cy="70"
        r="54"
        fill="none"
        stroke="#E6234E"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${(c * f).toFixed(1)} ${c.toFixed(1)}`}
        transform="rotate(-90 70 70)"
        filter={`url(#d${id})`}
      />
    </svg>
  );
}

export interface ColunaEmpilhada {
  rotulo: string;
  dica: string;
  partes: { valor: number; cor: string; brilho?: string }[];
  destaque?: boolean;
}

/** Colunas empilhadas com grade (leads por dia, dentro e fora do prazo). */
export function StackedColumns({ cols, altura = 180, max, ariaLabel }: { cols: ColunaEmpilhada[]; altura?: number; max?: number; ariaLabel: string }) {
  const m = max ?? Math.max(1, ...cols.map((c) => c.partes.reduce((s, p) => s + p.valor, 0)));
  const passo = m > 12 ? 5 : m > 6 ? 2 : 1;
  const linhas: number[] = [];
  for (let v = passo; v <= m; v += passo) linhas.push(v);
  return (
    <div>
      <div style={{ position: 'relative', height: altura, paddingLeft: 28 }}>
        {linhas.map((v) => (
          <div key={v} aria-hidden="true">
            <div style={{ position: 'absolute', left: 28, right: 0, bottom: (v / m) * altura, borderTop: '1px dashed var(--line)' }} />
            <span className="faint" style={{ position: 'absolute', left: 0, bottom: (v / m) * altura - 7, fontSize: 11 }}>
              {v}
            </span>
          </div>
        ))}
        <div role="img" aria-label={ariaLabel} style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'flex-end', gap: 8, borderBottom: '1px solid var(--line-2)' }}>
          {cols.map((c, i) => (
            <div key={i} title={c.dica} style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column-reverse', gap: 3, height: '100%' }}>
              {c.partes.map((p, j) =>
                p.valor > 0 ? (
                  <div
                    key={j}
                    style={{
                      height: (p.valor / m) * altura - 3,
                      borderRadius: 6,
                      background: p.cor,
                      boxShadow: c.destaque && p.brilho ? p.brilho : 'none',
                    }}
                  />
                ) : null,
              )}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" style={{ display: 'flex', gap: 8, paddingLeft: 28, marginTop: 8 }}>
        {cols.map((c, i) => (
          <span key={i} className={c.destaque ? '' : 'faint'} style={{ flex: '1 1 0', minWidth: 0, textAlign: 'center', fontSize: 10.5, fontWeight: c.destaque ? 600 : 400 }}>
            {c.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}
