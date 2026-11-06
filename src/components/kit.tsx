/**
 * Peças visuais do painel, no estilo da referência aprovada:
 * títulos grandes com a palavra-chave em rosa ou contornada, etiquetas em pílula,
 * cartões branco / rosa / preto com botão de seta, e textura de onda só nos destaques.
 */
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { AnimatedNumber, EASE, itemVariants } from './motion';
import { Wave } from './wave';

// ---------- formatos ----------

export function fmtPct(v: number | null | undefined, casas = 0): string {
  return v === null || v === undefined || Number.isNaN(v) ? '—' : `${v.toFixed(casas).replace('.', ',')}%`;
}

export function fmtNum(v: number | null | undefined, casas = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// ---------- texto ----------

/** Palavra em rosa dentro de um título. */
export function Hl({ children }: { children: ReactNode }) {
  return <span className="text-primary">{children}</span>;
}

/** Palavra contornada por uma pílula, como na referência. */
export function Pill({ children }: { children: ReactNode }) {
  return <span className="mx-[0.06em] inline-block rounded-full border-[0.055em] border-current px-[0.32em] pb-[0.06em] leading-[1.05]">{children}</span>;
}

/** Cápsula com a onda, usada uma vez por título. */
export function Capsule() {
  return (
    <span aria-hidden="true" className="relative mx-[0.12em] inline-block h-[0.62em] w-[1.45em] translate-y-[-0.06em] overflow-hidden rounded-full bg-brand-soft align-middle">
      <Wave className="absolute inset-0 size-full text-primary" opacidade={1} linhas={9} amplitude={42} duracao={16} />
    </span>
  );
}

/** Etiqueta pequena em pílula (contexto da tela ou do cartão). */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full border border-current/25 px-2.5 text-[11px] font-medium whitespace-nowrap', className)}>{children}</span>;
}

/** Pílula dentro de cartões (vendedores, etapas). */
export function Chip({ children, className, onClick, title }: { children: ReactNode; className?: string; onClick?: () => void; title?: string }) {
  const cls = cn('inline-flex h-7 items-center gap-1.5 rounded-full border border-current/20 px-2.5 text-xs whitespace-nowrap', onClick && 'transition-colors hover:border-current/50', className);
  return onClick ? (
    <button type="button" onClick={onClick} title={title} className={cls}>
      {children}
    </button>
  ) : (
    <span title={title} className={cls}>
      {children}
    </span>
  );
}

/** Linha de contexto de um número: meta, período anterior, time. */
export function Contexto({ itens, className }: { itens: (ReactNode | null | false)[]; className?: string }) {
  const vis = itens.filter(Boolean);
  return (
    <p className={cn('text-xs leading-relaxed opacity-70', className)}>
      {vis.map((x, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5 opacity-50">·</span>}
          {x}
        </span>
      ))}
    </p>
  );
}

// ---------- botões ----------

type Tom = 'white' | 'pink' | 'ink';

/** Círculo com seta: leva ao detalhe. */
export function ArrowLink({ to, onClick, label, tom = 'white', className }: { to?: string; onClick?: () => void; label: string; tom?: Tom; className?: string }) {
  const cls = cn(
    'group/seta inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
    tom === 'white' && 'bg-ink text-white hover:bg-primary',
    tom === 'pink' && 'bg-white text-primary',
    tom === 'ink' && 'bg-white text-ink hover:bg-primary hover:text-white',
    className,
  );
  const icone = <ArrowUpRight className="size-4 transition-transform duration-300 group-hover/seta:rotate-45" />;
  if (to)
    return (
      <Link to={to} aria-label={label} title={label} className={cls}>
        {icone}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>
      {icone}
    </button>
  );
}

/** Botão principal em pílula com a seta no círculo. */
export function Cta({ to, onClick, children, tom = 'pink', className }: { to?: string; onClick?: () => void; children: ReactNode; tom?: 'pink' | 'ink' | 'outline'; className?: string }) {
  const cls = cn(
    'group/cta inline-flex h-10 items-center gap-3 rounded-full pr-1 pl-4 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
    tom === 'pink' && 'bg-primary text-white hover:bg-primary/90',
    tom === 'ink' && 'bg-ink text-white hover:bg-ink/85',
    tom === 'outline' && 'border border-ink/80 text-foreground hover:bg-ink hover:text-white',
    className,
  );
  const circ = (
    <span className={cn('flex size-8 items-center justify-center rounded-full', tom === 'outline' ? 'bg-ink text-white' : 'bg-white', tom === 'pink' && 'text-primary', tom === 'ink' && 'text-ink')}>
      <ArrowUpRight className="size-4 transition-transform duration-300 group-hover/cta:rotate-45" />
    </span>
  );
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
        {circ}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
      {circ}
    </button>
  );
}

// ---------- estrutura ----------

/**
 * Abertura da tela: etiqueta + título que responde à pergunta da tela (à esquerda),
 * explicação curta + ação (à direita).
 */
export function Intro({ tag, title, aside, action, top }: { tag?: ReactNode; title: ReactNode; aside?: ReactNode; action?: ReactNode; top?: ReactNode }) {
  return (
    <motion.section variants={itemVariants} className="flex flex-col gap-5">
      {top}
      <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
        <div className="flex flex-col items-start gap-4">
          {tag && <Tag className="text-foreground">{tag}</Tag>}
          <h1 className="display max-w-[22ch] text-[34px] text-balance sm:text-[44px] xl:text-[52px]">{title}</h1>
        </div>
        {(aside || action) && (
          <div className="flex flex-col items-start gap-4 lg:pb-2">
            {aside && <p className="text-sm leading-relaxed text-muted-foreground">{aside}</p>}
            {action}
          </div>
        )}
      </div>
    </motion.section>
  );
}

/** Cartão base: branco, rosa (pede ação) ou preto (meta / destaque neutro). */
export function Bloco({
  tom = 'white',
  titulo,
  acao,
  children,
  className,
  onda = false,
  as = 'section',
}: {
  tom?: Tom;
  titulo?: ReactNode;
  acao?: ReactNode;
  children?: ReactNode;
  className?: string;
  onda?: boolean;
  as?: 'section' | 'div';
}) {
  const C = as === 'div' ? motion.div : motion.section;
  return (
    <C
      variants={itemVariants}
      className={cn(
        'relative isolate flex flex-col gap-5 overflow-hidden rounded-[22px] p-5 sm:p-6',
        tom === 'white' && 'border bg-card',
        tom === 'pink' && 'bg-primary text-white',
        tom === 'ink' && 'bg-ink text-white',
        className,
      )}
    >
      {onda && (
        <Wave
          className={cn('absolute inset-x-0 bottom-0 -z-10 h-[58%] w-full', tom === 'pink' ? 'text-white' : 'text-primary')}
          opacidade={tom === 'pink' ? 0.3 : 0.45}
        />
      )}
      {(titulo || acao) && (
        <div className="flex items-start justify-between gap-4">
          {titulo && <h2 className="eyebrow pt-1.5">{titulo}</h2>}
          {acao}
        </div>
      )}
      {children}
    </C>
  );
}

/** Número principal de um cartão. */
export function Numero({ value, format, unidade, className }: { value: number | null; format?: (v: number) => string; unidade?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className="display num text-[52px] leading-none">{value === null ? '—' : <AnimatedNumber value={value} format={format} />}</span>
      {unidade && <span className="text-sm opacity-70">{unidade}</span>}
    </div>
  );
}

/** Barra de progresso com marca opcional (meta ou onde deveria estar). */
export function Medidor({ pct, marca, tom = 'white', delay = 0.15, className }: { pct: number | null; marca?: number | null; tom?: Tom; delay?: number; className?: string }) {
  const w = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className={cn('relative h-2 w-full rounded-full', tom === 'white' ? 'bg-track' : 'bg-white/20', className)}>
      <motion.div
        className={cn('absolute inset-y-0 left-0 rounded-full', tom === 'white' ? 'bg-ink' : tom === 'pink' ? 'bg-white' : 'bg-primary')}
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.9, ease: EASE, delay }}
      />
      {marca !== null && marca !== undefined && (
        <span
          aria-hidden="true"
          className={cn('absolute -inset-y-1 w-0.5 rounded-full', tom === 'white' ? 'bg-primary' : 'bg-white')}
          style={{ left: `calc(${Math.max(0, Math.min(100, marca))}% - 1px)` }}
        />
      )}
    </div>
  );
}

/** Pílulas de filtro (uma ativa, em preto), com o destaque deslizando. */
export function Pilulas<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
  className,
}: {
  id: string;
  value: T;
  options: [T, ReactNode][];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {options.map(([v, rot]) => {
        const ativo = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(v)}
            className={cn(
              'relative inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
              ativo ? 'border-ink text-white' : 'border-ink/15 bg-card hover:border-ink/40',
            )}
          >
            {ativo && <motion.span layoutId={`pil-${id}`} transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-[-1px] rounded-full bg-ink" />}
            <span className="relative flex items-center gap-1.5">{rot}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Bolinha de cor (etapa, origem, status). */
export function Dot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block size-2 shrink-0 rounded-full', className)} style={{ background: color }} />;
}

// ---------- pessoas ----------

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
