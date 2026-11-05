import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedNumber, Reveal } from './motion';
import { Sparkline } from './charts';

export function fmtPct(v: number | null | undefined, casas = 0): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(casas).replace('.', ',')}%`;
}

export function fmtNum(v: number | null | undefined, casas = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Título da página: direto, como no shadcn. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex max-w-3xl flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </Reveal>
  );
}

/** Número em destaque dentro de um texto. */
export function Strong({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'primary' | 'warning' }) {
  return (
    <span className={cn('font-medium', tone === 'primary' ? 'text-primary' : tone === 'warning' ? 'text-warning-foreground' : 'text-foreground')}>
      {children}
    </span>
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
  neutro?: boolean;
  unidade?: string;
  sufixo?: string;
}) {
  if (v === null || Number.isNaN(v)) return <span className="text-muted-foreground">sem comparação</span>;
  const casas = Math.abs(v) < 10 && unidade !== 'min' ? 1 : 0;
  const num = fmtNum(Math.abs(v), casas);
  const zero = Number(Math.abs(v).toFixed(casas)) === 0;
  const bom = invert ? v < 0 : v > 0;
  const sinal = zero ? '' : v > 0 ? '+' : '−';
  const cor = neutro || zero || Math.abs(v) < 0.5 ? 'text-muted-foreground' : bom ? 'text-success' : 'text-primary';
  return (
    <span className={cor}>
      {sinal}
      {unidade === '%' ? `${num}%` : `${num} ${unidade}`}
      {sufixo ? <span className="text-muted-foreground"> {sufixo}</span> : null}
    </span>
  );
}

/** Cartão de indicador. */
export function StatCard({
  label,
  value,
  format,
  sufixo,
  delta,
  spark,
  icon,
  className,
}: {
  label: string;
  value: number | null;
  format?: (v: number) => string;
  sufixo?: ReactNode;
  delta?: ReactNode;
  spark?: number[];
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('gap-3', className)}>
      <CardHeader>
        <CardDescription className="flex items-center justify-between gap-2">
          <span>{label}</span>
          {icon && <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>}
        </CardDescription>
        <CardTitle className="flex items-baseline gap-2 text-3xl font-semibold tracking-tight">
          {value === null ? '—' : <AnimatedNumber value={value} format={format} />}
          {sufixo && <span className="text-sm font-normal text-muted-foreground">{sufixo}</span>}
        </CardTitle>
      </CardHeader>
      {(spark || delta) && (
        <CardContent className="mt-auto flex flex-col gap-2">
          {spark && <Sparkline values={spark} />}
          {delta && <div className="text-xs">{delta}</div>}
        </CardContent>
      )}
    </Card>
  );
}

/** Bolinha de cor (etapa, origem, status). */
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ background: color }} />;
}

/** Avatar com iniciais e cor estável por nome (como no CRM). */
const PALETA = ['#F6A53B', '#F0412F', '#B9A4F5', '#7FD8B6', '#C66BD9', '#F35D4F', '#9E7BE0', '#D3A5A8', '#7CCF7E', '#5FB0E8', '#E58BB3', '#8CA0B3'];

export function corDoNome(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const a = partes[0]?.[0] ?? '';
  const b = partes.length > 1 ? partes[partes.length - 1][0] : (partes[0]?.[1] ?? '');
  return (a + b).toUpperCase();
}

export function NameAvatar({ nome, size = 32, className }: { nome: string; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white', className)}
      style={{ width: size, height: size, background: corDoNome(nome), fontSize: size * 0.38 }}
    >
      {iniciaisDe(nome)}
    </span>
  );
}
