import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DADOS, PlanilhaProvider } from './estado';
import { FunilP } from './paginas/Funil';
import { Hoje } from './paginas/Hoje';
import { KanbanP } from './paginas/Kanban';
import { MetasP } from './paginas/Metas';
import { Pendencias } from './paginas/Pendencias';
import { Reunioes } from './paginas/Reunioes';
import { Time } from './paginas/Time';
import { ShellPlanilha } from './Shell';

/** Versão do painel alimentada pela planilha de follow-up (npm run build:planilha). */
export function AppPlanilha() {
  if (!DADOS || DADOS.meses.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-3 px-6 text-sm leading-relaxed">
        <h1 className="display text-3xl">Falta importar a planilha</h1>
        <p className="text-muted-foreground">
          Rode <code className="rounded bg-muted px-1.5 py-0.5">python3 scripts/importar_planilha.py caminho/da/planilha.xlsx</code> e gere o build de novo.
        </p>
      </div>
    );
  }
  return (
    <PlanilhaProvider dados={DADOS}>
      <HashRouter>
        <Routes>
          <Route element={<ShellPlanilha />}>
            <Route index element={<Hoje />} />
            <Route path="kanban" element={<KanbanP />} />
            <Route path="reunioes" element={<Reunioes />} />
            <Route path="time" element={<Time />} />
            <Route path="funil" element={<Navigate to="/funil/etapas" replace />} />
            <Route path="funil/:aba" element={<FunilP />} />
            <Route path="metas" element={<MetasP />} />
            <Route path="pendencias" element={<Pendencias />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </PlanilhaProvider>
  );
}
