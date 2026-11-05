import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { Agenda } from './pages/Agenda';
import { Configuracoes } from './pages/Configuracoes';
import { Fila } from './pages/Fila';
import { Funil } from './pages/Funil';
import { Marketing } from './pages/Marketing';
import { Metas } from './pages/Metas';
import { Perdas } from './pages/Perdas';
import { Performance } from './pages/Performance';
import { VisaoGeral } from './pages/VisaoGeral';
import { PainelProvider } from './state/painel';

export function App() {
  return (
    <PainelProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<VisaoGeral />} />
            <Route path="fila" element={<Fila />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="performance" element={<Performance />} />
            <Route path="funil" element={<Funil />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="perdas" element={<Perdas />} />
            <Route path="metas" element={<Metas />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </PainelProvider>
  );
}
