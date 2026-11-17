import { MotionConfig } from 'motion/react';
import { type ComponentType, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';

/**
 * Duas versões do mesmo painel:
 *  - padrão: simulador (e, no futuro, a réplica do CRM);
 *  - VITE_FONTE=planilha: lê a planilha de follow-up importada (npm run build:planilha).
 * O import dinâmico deixa no build só a versão escolhida.
 */
const carregar: Promise<ComponentType> =
  import.meta.env.VITE_FONTE === 'planilha' ? import('./planilha/AppPlanilha').then((m) => m.AppPlanilha) : import('./App').then((m) => m.App);

carregar.then((App) =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          <App />
        </TooltipProvider>
      </MotionConfig>
    </StrictMode>,
  ),
);
