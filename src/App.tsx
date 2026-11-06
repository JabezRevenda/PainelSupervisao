import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { Agenda } from './pages/Agenda';
import { Analises } from './pages/Analises';
import { Configuracoes } from './pages/Configuracoes';
import { Fila } from './pages/Fila';
import { Kanban } from './pages/Kanban';
import { Metas } from './pages/Metas';
import { Performance } from './pages/Performance';
import { VisaoGeral } from './pages/VisaoGeral';
import { PainelProvider } from './state/painel';

export function App() {
  return (
    <PainelProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<VisaoGeral />} />
            <Route path="kanban" element={<Kanban />} />
            <Route path="fila" element={<Fila />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="time" element={<Performance />} />
            <Route path="analises" element={<Navigate to="/analises/funil" replace />} />
            <Route path="analises/:aba" element={<Analises />} />
            <Route path="metas" element={<Metas />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            {/* endereços antigos */}
            <Route path="performance" element={<Navigate to="/time" replace />} />
            <Route path="funil" element={<Navigate to="/analises/funil" replace />} />
            <Route path="marketing" element={<Navigate to="/analises/origem" replace />} />
            <Route path="perdas" element={<Navigate to="/analises/perdas" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </PainelProvider>
  );
}
