/**
 * Movimento do painel: curto, com desaceleração natural, sem exageros.
 * Tudo respeita "reduzir movimento" do sistema (MotionConfig em main.tsx).
 */
import { animate, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export const EASE = [0.22, 1, 0.36, 1] as const;
export const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 } as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

/** Container da página: os filhos `Reveal` entram em sequência. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div initial="hidden" animate="show" variants={container} className={cn('flex flex-col gap-6', className)}>
      {children}
    </motion.div>
  );
}

export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

/** Grade cujos itens entram em sequência. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

/** Número que conta até o valor (e anima quando o valor muda). */
export function AnimatedNumber({
  value,
  format = (v) => Math.round(v).toLocaleString('pt-BR'),
  className,
  duration = 0.9,
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef(0);
  const reduzir = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduzir) {
      el.textContent = format(value);
      anterior.current = value;
      return;
    }
    const c = animate(anterior.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = format(v);
      },
    });
    anterior.current = value;
    return () => c.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={ref} className={cn('num', className)}>
      {format(reduzir ? value : 0)}
    </span>
  );
}

/** Barra horizontal que cresce até `pct`. */
export function GrowBar({
  pct,
  className,
  barClassName,
  color,
  delay = 0,
}: {
  pct: number | null;
  className?: string;
  barClassName?: string;
  color?: string;
  delay?: number;
}) {
  const w = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <motion.div
        className={cn('h-full rounded-full bg-primary', barClassName)}
        style={color ? { background: color } : undefined}
        initial={{ width: 0 }}
        animate={{ width: `${w}%` }}
        transition={{ duration: 0.8, ease: EASE, delay }}
      />
    </div>
  );
}

/** Seletor segmentado no estilo das abas do shadcn, com o destaque deslizando. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  id,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
  id: string;
}) {
  return (
    <LayoutGroup id={id}>
      <div role="group" aria-label={label} className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
        {options.map(([v, l]) => {
          const ativo = v === value;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={ativo}
              onClick={() => onChange(v)}
              className={cn(
                'relative h-full rounded-md px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                ativo ? 'text-foreground' : 'hover:text-foreground',
              )}
            >
              {ativo && <motion.span layoutId="seg" transition={SPRING} className="absolute inset-0 rounded-md bg-background shadow-sm dark:bg-input/40" />}
              <span className="relative">{l}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

export { motion };
