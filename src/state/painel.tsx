import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { construirViews, type LeadView } from '../data/metrics/estado';
import { META_PADRAO_POR_VENDEDOR, OKRS_PADRAO, PARAMETROS_PADRAO } from '../data/params';
import { criarFonte, type FonteDeDados } from '../data/source';
import { startOfMonth, startOfQuarter } from '../data/time';
import type { Dataset, Objetivo, Parametros, Usuario } from '../data/types';

export type Tema = 'dark' | 'light';

export interface AlertasConfig {
  slaEstourado: boolean;
  parado: boolean;
  atencao: boolean;
  resumoDoDia: boolean;
  sinalVendedor: boolean;
}

export interface Config {
  params: Parametros;
  /** Meta mensal de contratos por vendedor (id → alvo) */
  metas: Record<string, number>;
  /** Alvos editados dos resultados-chave (id do KR → alvo) */
  alvosOkr: Record<string, number>;
  alertas: AlertasConfig;
  semente: string;
  tema: Tema;
}

const CHAVE = 'revenda-mais:painel-supervisao:v2';
const ATUALIZA_MS = 60_000;

const CONFIG_PADRAO: Config = {
  params: PARAMETROS_PADRAO,
  metas: {},
  alvosOkr: {},
  alertas: { slaEstourado: true, parado: true, atencao: true, resumoDoDia: true, sinalVendedor: false },
  semente: 'revenda-mais',
  tema: 'light',
};

function lerConfig(): Config {
  try {
    const raw = localStorage.getItem(CHAVE);
    if (!raw) return CONFIG_PADRAO;
    const c = JSON.parse(raw) as Partial<Config>;
    return {
      ...CONFIG_PADRAO,
      ...c,
      params: { ...PARAMETROS_PADRAO, ...(c.params ?? {}) },
      alertas: { ...CONFIG_PADRAO.alertas, ...(c.alertas ?? {}) },
    };
  } catch {
    return CONFIG_PADRAO;
  }
}

interface PainelValor {
  config: Config;
  setConfig: (f: (c: Config) => Config) => void;
  resetConfig: () => void;
  fonte: FonteDeDados;
  ds: Dataset | null;
  views: LeadView[];
  /** Dataset no início do trimestre (linha de base dos OKRs) */
  dsBase: Dataset | null;
  viewsBase: LeadView[];
  agora: number;
  atualizadoEm: number | null;
  atualizar: () => void;
  vendedores: Usuario[];
  nome: (id: string) => string;
  iniciais: (id: string) => string;
  metas: Record<string, number>;
  okrs: Objetivo[];
  leadAberto: string | null;
  abrirLead: (id: string | null) => void;
  erro: string | null;
}

const Ctx = createContext<PainelValor | null>(null);

export function PainelProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(lerConfig);
  const [agora, setAgora] = useState(() => Date.now());
  const [ds, setDs] = useState<Dataset | null>(null);
  const [dsBase, setDsBase] = useState<Dataset | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [leadAberto, setLeadAberto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const fonte = useMemo(() => criarFonte(config.semente), [config.semente]);

  const setConfig = useCallback((f: (c: Config) => Config) => {
    setConfigState((c) => {
      const n = f(c);
      try {
        localStorage.setItem(CHAVE, JSON.stringify(n));
      } catch {
        /* sem armazenamento: segue só na memória */
      }
      return n;
    });
  }, []);

  const resetConfig = useCallback(() => {
    try {
      localStorage.removeItem(CHAVE);
    } catch {
      /* ignora */
    }
    setConfigState({ ...CONFIG_PADRAO, tema: config.tema });
  }, [config.tema]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', config.tema === 'dark');
  }, [config.tema]);

  // Recalcula a cada minuto (o mesmo ritmo previsto para a réplica)
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), ATUALIZA_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let vivo = true;
    fonte
      .carregar(agora)
      .then((d) => {
        if (!vivo) return;
        setDs(d);
        setAtualizadoEm(Date.now());
        setErro(null);
      })
      .catch((e: Error) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [fonte, agora]);

  const inicioTrimestre = startOfQuarter(agora);
  useEffect(() => {
    let vivo = true;
    fonte.carregarEm(inicioTrimestre, Date.now()).then((d) => vivo && setDsBase(d)).catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [fonte, inicioTrimestre]);

  const views = useMemo(() => (ds ? construirViews(ds, config.params) : []), [ds, config.params]);
  const viewsBase = useMemo(() => (dsBase ? construirViews(dsBase, config.params) : []), [dsBase, config.params]);

  const vendedores = useMemo(
    () => (ds?.usuarios ?? []).filter((u) => u.funcao === 'vendedor' && u.equipe === 'inside_sales' && u.ativo),
    [ds],
  );
  const mapaNomes = useMemo(() => new Map((ds?.usuarios ?? []).map((u) => [u.id, u.nome])), [ds]);
  const nome = useCallback((id: string) => mapaNomes.get(id) ?? id, [mapaNomes]);
  const iniciais = useCallback((id: string) => (mapaNomes.get(id) ?? id).slice(0, 2).toUpperCase(), [mapaNomes]);

  const mes = startOfMonth(agora);
  const metas = useMemo(() => {
    const m: Record<string, number> = {};
    for (const v of vendedores) m[v.id] = config.metas[v.id] ?? META_PADRAO_POR_VENDEDOR;
    return m;
  }, [vendedores, config.metas, mes]); // eslint-disable-line react-hooks/exhaustive-deps

  const okrs = useMemo(
    () =>
      OKRS_PADRAO.map((o) => ({
        ...o,
        resultados: o.resultados.map((kr) => ({
          ...kr,
          alvo:
            config.alvosOkr[kr.id] ??
            (kr.indicador === 'contratos_mes' ? Object.values(metas).reduce((a, b) => a + b, 0) : kr.alvo),
        })),
      })),
    [config.alvosOkr, metas],
  );

  const valor: PainelValor = {
    config,
    setConfig,
    resetConfig,
    fonte,
    ds,
    views,
    dsBase,
    viewsBase,
    agora,
    atualizadoEm,
    atualizar: () => setAgora(Date.now()),
    vendedores,
    nome,
    iniciais,
    metas,
    okrs,
    leadAberto,
    abrirLead: setLeadAberto,
    erro,
  };
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePainel(): PainelValor & { ds: Dataset } {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePainel fora do PainelProvider');
  return v as PainelValor & { ds: Dataset };
}

/** Relógio que bate a cada `ms` (cronômetros ao vivo). */
export function useRelogio(ms = 1000): number {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setT(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}
