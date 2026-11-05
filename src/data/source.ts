/**
 * Fonte de dados do painel.
 *
 * O painel só conhece a interface `FonteDeDados`. Hoje ela é atendida pela
 * `FonteSimulada`. Quando a réplica de leitura existir, a TI implementa a
 * `FonteApi` (ou equivalente) devolvendo o mesmo `Dataset` e troca a fonte em
 * `criarFonte()`. Nenhuma tela ou fórmula precisa mudar.
 */
import { materializar, type PlanoSimulado, simular } from './simulator';
import { dayKey } from './time';
import type { Dataset } from './types';

export interface FonteDeDados {
  readonly nome: string;
  readonly simulada: boolean;
  /** O CRM como está agora. */
  carregar(agora: number): Promise<Dataset>;
  /** O CRM como estava em um instante passado (linha de base dos OKRs, foto diária). */
  carregarEm(instante: number, agora: number): Promise<Dataset>;
}

export class FonteSimulada implements FonteDeDados {
  readonly nome = 'Simulação';
  readonly simulada = true;
  private plano: PlanoSimulado | null = null;
  private chave = '';

  constructor(private readonly semente: string) {}

  private planoPara(agora: number): PlanoSimulado {
    // O plano é regerado uma vez por dia (o histórico é estável dentro do dia).
    const chave = `${this.semente}:${dayKey(agora)}`;
    if (!this.plano || this.chave !== chave) {
      this.plano = simular(this.semente, agora);
      this.chave = chave;
    }
    return this.plano;
  }

  async carregar(agora: number): Promise<Dataset> {
    return materializar(this.planoPara(agora), agora);
  }

  async carregarEm(instante: number, agora: number): Promise<Dataset> {
    return materializar(this.planoPara(agora), instante);
  }

  /** Acesso síncrono (testes e cálculos em lote). */
  agoraSync(agora: number): Dataset {
    return materializar(this.planoPara(agora), agora);
  }
}

/**
 * Esqueleto da fonte real. Endpoints sugeridos para a API do painel (lendo a réplica):
 *   GET /api/painel/dataset?ate=<epoch ms>&desde=<epoch ms>
 * A resposta deve seguir o formato `Dataset` (ver types.ts e db/schema.sql).
 */
export class FonteApi implements FonteDeDados {
  readonly nome = 'Réplica do CRM';
  readonly simulada = false;
  constructor(private readonly baseUrl: string) {}

  private async get(ate: number): Promise<Dataset> {
    const desde = ate - 130 * 24 * 3600 * 1000;
    const r = await fetch(`${this.baseUrl}/api/painel/dataset?ate=${ate}&desde=${desde}`, { credentials: 'include' });
    if (!r.ok) throw new Error(`Falha ao ler a réplica (${r.status})`);
    return (await r.json()) as Dataset;
  }

  carregar(agora: number) {
    return this.get(agora);
  }

  carregarEm(instante: number) {
    return this.get(instante);
  }
}

export function criarFonte(semente: string): FonteDeDados {
  const api = import.meta.env.VITE_PAINEL_API_URL as string | undefined;
  return api ? new FonteApi(api) : new FonteSimulada(semente);
}
