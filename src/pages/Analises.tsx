import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Pilulas } from '@/components/kit';
import { Funil } from './Funil';
import { Marketing } from './Marketing';
import { Perdas } from './Perdas';

type Aba = 'funil' | 'origem' | 'perdas';
export type Janela = '30' | '60' | '90';

/** Análises: três perguntas, uma por aba, com a mesma janela de tempo. */
export function Analises() {
  const { aba } = useParams();
  const navigate = useNavigate();
  const [janela, setJanela] = useState<Janela>('60');
  if (aba !== 'funil' && aba !== 'origem' && aba !== 'perdas') return <Navigate to="/analises/funil" replace />;

  const topo = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Pilulas
        id="analises"
        label="Análise"
        value={aba as Aba}
        onChange={(a) => navigate(`/analises/${a}`)}
        options={[
          ['funil', 'Funil'],
          ['origem', 'Origem do lead'],
          ['perdas', 'Perdas'],
        ]}
      />
      <Pilulas
        id="janela"
        label="Janela"
        value={janela}
        onChange={setJanela}
        options={[
          ['30', '30 dias'],
          ['60', '60 dias'],
          ['90', '90 dias'],
        ]}
      />
    </div>
  );

  const dias = Number(janela);
  if (aba === 'origem') return <Marketing key="origem" dias={dias} topo={topo} />;
  if (aba === 'perdas') return <Perdas key="perdas" dias={dias} topo={topo} />;
  return <Funil key="funil" dias={dias} topo={topo} />;
}
