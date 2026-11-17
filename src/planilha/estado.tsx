import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { monthKey } from '@/data/time';
import { type DadosPlanilha, type LeadP, type MesPlanilha, prepararLeads } from './modelo';

/** O JSON gerado pelo importador. Fica fora do git (dados reais). */
const arquivos = import.meta.glob<DadosPlanilha>('./dados.json', { eager: true, import: 'default' });
export const DADOS: DadosPlanilha | null = Object.values(arquivos)[0] ?? null;

const CHAVE_TEMA = 'revenda-mais:painel-planilha:tema';

export type Tema = 'light' | 'dark';

interface Valor {
  dados: DadosPlanilha;
  todos: LeadP[];
  meses: MesPlanilha[];
  /** Mês selecionado no topo */
  mes: MesPlanilha;
  setMes: (chave: string) => void;
  /** Leads do mês selecionado */
  leads: LeadP[];
  /** Mês anterior ao selecionado (comparações) */
  anterior: { mes: MesPlanilha; ls: LeadP[] } | null;
  leadsDoMes: (chave: string) => LeadP[];
  /** Última meta de cadastros informada na planilha */
  metaPadrao: number | null;
  agora: number;
  tema: Tema;
  setTema: (t: Tema) => void;
  leadAberto: string | null;
  abrirLead: (uid: string | null) => void;
}

const Ctx = createContext<Valor | null>(null);

function lerTema(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function PlanilhaProvider({ dados, children }: { dados: DadosPlanilha; children: ReactNode }) {
  const [agora, setAgora] = useState(() => Date.now());
  const todos = useMemo(() => prepararLeads(dados), [dados]);
  const meses = dados.meses;
  const atual = monthKey(agora);
  const padrao = meses.find((m) => m.chave === atual)?.chave ?? meses[meses.length - 1].chave;
  const [chave, setMes] = useState(padrao);
  const [tema, setTemaState] = useState<Tema>(lerTema);
  const [leadAberto, abrirLead] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'dark');
  }, [tema]);

  const setTema = useCallback((t: Tema) => {
    setTemaState(t);
    try {
      localStorage.setItem(CHAVE_TEMA, t);
    } catch {
      /* sem armazenamento: segue só na memória */
    }
  }, []);

  const porMes = useMemo(() => {
    const m = new Map<string, LeadP[]>();
    for (const l of todos) (m.get(l.mes) ?? m.set(l.mes, []).get(l.mes)!).push(l);
    return m;
  }, [todos]);
  const leadsDoMes = useCallback((c: string) => porMes.get(c) ?? [], [porMes]);

  const idx = Math.max(0, meses.findIndex((m) => m.chave === chave));
  const mes = meses[idx];
  const anterior = idx > 0 ? { mes: meses[idx - 1], ls: leadsDoMes(meses[idx - 1].chave) } : null;
  const metaPadrao = [...meses].reverse().find((m) => m.meta !== null)?.meta ?? null;

  const valor: Valor = {
    dados,
    todos,
    meses,
    mes,
    setMes,
    leads: leadsDoMes(mes.chave),
    anterior,
    leadsDoMes,
    metaPadrao,
    agora,
    tema,
    setTema,
    leadAberto,
    abrirLead,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePlanilha(): Valor {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlanilha fora do PlanilhaProvider');
  return v;
}

/** "novembro" a partir de "Novembro 2026". */
export function nomeCurto(m: MesPlanilha): string {
  return m.nome.split(' ')[0].toLowerCase();
}
