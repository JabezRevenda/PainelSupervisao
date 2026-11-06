/**
 * Onda de linhas: a textura da marca nos cartões de destaque.
 * Desenhada em SVG (leve, nítida em qualquer tela) e com deriva lenta.
 */
import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const W = 800; // largura de um ciclo completo: o desenho se repete sem emenda
const H = 220;

function caminhos(linhas: number, amplitude: number) {
  const out: string[] = [];
  for (let i = 0; i < linhas; i++) {
    const t = i / (linhas - 1);
    const cy = H / 2 + (t - 0.5) * H * 0.42;
    const a = amplitude * (0.45 + 0.55 * Math.sin(Math.PI * t));
    const fase = t * 1.4;
    let d = '';
    for (let x = 0; x <= W * 2; x += 10) {
      const y = cy + a * Math.sin((2 * Math.PI * 2 * x) / W + fase) + a * 0.55 * Math.sin((2 * Math.PI * x) / W - fase * 0.8);
      d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`;
    }
    out.push(d);
  }
  return out;
}

export function Wave({ className, color = 'currentColor', linhas = 26, amplitude = 34, opacidade = 0.5, duracao = 28 }: { className?: string; color?: string; linhas?: number; amplitude?: number; opacidade?: number; duracao?: number }) {
  const reduzir = useReducedMotion();
  const ds = useMemo(() => caminhos(linhas, amplitude), [linhas, amplitude]);
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={cn('pointer-events-none', className)}>
      <motion.g animate={reduzir ? undefined : { x: [0, -W] }} transition={{ duration: duracao, ease: 'linear', repeat: Infinity }}>
        {ds.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={color} strokeWidth={1} strokeOpacity={opacidade * (0.35 + 0.65 * Math.sin((Math.PI * i) / (ds.length - 1)))} />
        ))}
      </motion.g>
    </svg>
  );
}
