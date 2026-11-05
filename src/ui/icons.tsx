const PATHS = {
  visao: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  fila: 'M12 3l9.5 16.5h-19L12 3zM12 10v4M12 17h.01',
  agenda: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  equipe: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  funil: 'M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z',
  alvo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  queda: 'M22 17l-8.5-8.5-5 5L2 7M16 17h6v-6',
  meta: 'M12 14l4-4M3.34 19a10 10 0 1 1 17.32 0',
  config: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  seta: 'M7 17L17 7M8 7h9v9',
  direita: 'M5 12h14M13 6l6 6-6 6',
  chevron: 'M9 6l6 6-6 6',
  fechar: 'M6 6l12 12M18 6L6 18',
  relogio: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  cronometro: 'M10 2h4M12 14l3-3M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z',
  pessoas: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  conversa: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  whatsapp: 'M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.5 8.5 0 1 1 21 11.5z',
  sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  lua: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  atualizar: 'M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0 1 14.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0 0 20.5 15',
  baixo: 'M12 5v14M6 13l6 6 6-6',
  check: 'M20 6L9 17l-5-5',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, stroke = 1.9, className }: { name: IconName; size?: number; stroke?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
