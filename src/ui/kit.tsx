import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons';

export function fmtPct(v: number | null | undefined, casas = 0): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(casas).replace('.', ',')}%`;
}

export function fmtNum(v: number | null | undefined, casas = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Título no estilo da marca: palavra em rosa, cápsula e palavra contornada. */
export function Hl({ children }: { children: ReactNode }) {
  return <span className="hl">{children}</span>;
}
export function Ring({ children }: { children: ReactNode }) {
  return <span className="ring">{children}</span>;
}
export function Capsule() {
  return <span className="capsule" aria-hidden="true" />;
}

export function Hero({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text?: ReactNode }) {
  return (
    <section className="hero">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="h1">{title}</h1>
      {text && <p className="lead-text">{text}</p>}
    </section>
  );
}

export function CardHead({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="card-head">
      <div className="stack">
        <h2 className="h2">{title}</h2>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Avatar({ text, status }: { text: string; status?: string }) {
  return (
    <span className="avatar">
      {text}
      {status && <span className="status" style={{ background: status }} />}
    </span>
  );
}

export function Bar({ pct, tone = 'red', style }: { pct: number | null; tone?: 'red' | 'amber' | 'neutral' | 'text'; style?: CSSProperties }) {
  const w = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <span className="track" style={style}>
      <span className={`fill-${tone}`} style={{ width: `${w}%` }} />
    </span>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => onChange(!on)} />;
}

export function LinkArrow({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, textDecoration: 'none' }}>
      {children} <Icon name="direita" size={15} stroke={2.2} />
    </Link>
  );
}

export function Delta({
  v,
  invert = false,
  neutro = false,
  unidade = 'p.p.',
  sufixo,
}: {
  v: number | null;
  invert?: boolean;
  /** Variação sem juízo de valor (ex.: volume de leads, que não depende do vendedor) */
  neutro?: boolean;
  unidade?: string;
  sufixo?: string;
}) {
  if (v === null || Number.isNaN(v)) return <span className="faint">sem comparação</span>;
  const bom = invert ? v < 0 : v > 0;
  const sinal = v > 0 ? '+' : v < 0 ? '−' : '';
  const cls = neutro || Math.abs(v) < 0.5 ? 'muted' : bom ? 'delta-good' : 'delta-bad';
  const num = fmtNum(Math.abs(v), Math.abs(v) < 10 && unidade !== 'min' ? 1 : 0);
  return (
    <span className={cls}>
      {sinal}
      {unidade === '%' ? `${num}%` : `${num} ${unidade}`}
      {sufixo ? ` ${sufixo}` : ''}
    </span>
  );
}
