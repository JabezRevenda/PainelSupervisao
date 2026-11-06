/**
 * Movimento do painel: curto, com desaceleração natural, sem exageros.
 * Tudo respeita "reduzir movimento" do sistema (MotionConfig em main.tsx).
 */
import { animate, motion, useReducedMotion } from 'motion/react';
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

export { motion };
