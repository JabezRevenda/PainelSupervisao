import { useEffect, useMemo } from 'react';
import { alertas } from '../data/metrics/estado';
import { fmtDateTime, fmtHours, fmtMinutes, fmtRelativeDay, fmtTime } from '../data/time';
import { CANAL_LABEL, ETAPA_LABEL, TIPO_INTERACAO_LABEL } from '../data/types';
import { usePainel } from '../state/painel';
import { Icon } from '../ui/icons';

interface Evento {
  em: number;
  texto: string;
  nivel: 0 | 1 | 2;
}

const VIA: Record<string, string> = {
  whatsapp_crm: 'pelo WhatsApp do CRM',
  registro_rapido: 'registro rápido',
  manual: 'registro manual',
};

export function LeadDrawer() {
  const { leadAberto, abrirLead, views, agora, config, nome, ds } = usePainel();
  const v = useMemo(() => views.find((x) => x.lead.id === leadAberto) ?? null, [views, leadAberto]);

  useEffect(() => {
    if (!leadAberto) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && abrirLead(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [leadAberto, abrirLead]);

  if (!leadAberto || !v) return null;
  const p = config.params;
  const al = alertas(v, agora, p);
  const principal = al[0];

  const eventos: Evento[] = [{ em: v.lead.criadoEm, texto: `Entrou no CRM por ${CANAL_LABEL[v.lead.canal]}${v.lead.utmCampaign ? ` (campanha ${v.lead.utmCampaign})` : ''}`, nivel: 0 }];
  for (const a of v.atribuicoes) {
    eventos.push({
      em: a.em,
      texto: a.vendedorAnteriorId
        ? `${nome(a.atribuidoPorId)} trocou de ${nome(a.vendedorAnteriorId)} para ${nome(a.vendedorNovoId)}: o prazo de 1 hora recomeça`
        : `${nome(a.atribuidoPorId)} agendou a demo e atribuiu a ${nome(a.vendedorNovoId)}`,
      nivel: 0,
    });
  }
  for (const i of v.interacoes) {
    const atraso = i.registradoEm - i.ocorridoEm > 15 * 60_000 ? ` · registrado às ${fmtTime(i.registradoEm)}` : '';
    eventos.push({ em: i.ocorridoEm, texto: `${TIPO_INTERACAO_LABEL[i.tipo]} (${VIA[i.via]})${atraso}`, nivel: 0 });
  }
  for (const d of v.demos) {
    if (d.status === 'realizada' && d.desfechoEm) eventos.push({ em: d.desfechoEm, texto: `Demo de ${fmtDateTime(d.agendadaPara)} marcada como realizada`, nivel: 0 });
    if (d.status === 'nao_compareceu' && d.desfechoEm) eventos.push({ em: d.desfechoEm, texto: `Lead não compareceu à demo de ${fmtDateTime(d.agendadaPara)}`, nivel: 1 });
  }
  for (const h of v.historico) {
    if (h.para === 'demo_agendada' || h.para === 'demo_realizada') continue;
    const motivo = h.motivoPerdaId ? ` · ${ds.motivos.find((m) => m.id === h.motivoPerdaId)?.nome}` : '';
    eventos.push({ em: h.em, texto: `Etapa: ${ETAPA_LABEL[h.para]}${motivo}`, nivel: h.para === 'perdido' ? 1 : 0 });
  }
  if (v.primeiroContatoEm === null && v.status === 'aberto' && agora >= v.prazoSla) {
    eventos.push({ em: v.prazoSla, texto: 'Prazo de 1 hora útil estourado sem nenhuma interação', nivel: 2 });
  }
  if (v.passoVencido) eventos.push({ em: v.passoVencido.previstoPara, texto: 'Próximo passo venceu sem contato', nivel: 1 });
  eventos.sort((a, b) => a.em - b.em);

  const corTag = principal?.cor === 'vermelho' ? 'tag tag--red' : principal ? 'tag tag--amber' : 'tag';
  const proximo = v.proximoPasso
    ? `${fmtRelativeDay(v.proximoPasso.previstoPara, agora)} · ${fmtTime(v.proximoPasso.previstoPara)}`
    : v.proximaDemo
      ? `Demo ${fmtRelativeDay(v.proximaDemo.agendadaPara, agora)} · ${fmtTime(v.proximaDemo.agendadaPara)}`
      : v.passoVencido
        ? `Vencido · ${fmtRelativeDay(v.passoVencido.previstoPara, agora)}`
        : 'Nenhum';

  return (
    <div className="drawer-wrap">
      <button type="button" className="drawer-backdrop" aria-label="Fechar a ficha do lead" onClick={() => abrirLead(null)} />
      <aside className="drawer" aria-label={`Ficha de ${v.lead.revenda}`}>
        <div className="between" style={{ alignItems: 'flex-start' }}>
          <div className="stack gap-8">
            <span className={corTag} style={{ alignSelf: 'flex-start' }}>
              {principal ? principal.rotulo : v.status === 'ganho' ? 'Ganho' : v.status === 'perdido' ? 'Perdido' : 'Em dia'}
            </span>
            <h2 className="h2" style={{ fontSize: 26 }}>
              {v.lead.revenda}
            </h2>
            <span className="muted">
              {v.lead.cidade}/{v.lead.uf} · {ETAPA_LABEL[v.etapa]}
            </span>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => abrirLead(null)}>
            <Icon name="fechar" size={16} />
          </button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          <div className="mini">
            <span className="faint" style={{ fontSize: 12 }}>Sem interação</span>
            <span className="num" style={{ fontSize: 18, color: principal?.cor === 'vermelho' ? 'var(--accent-text)' : principal ? 'var(--amber-text)' : undefined }}>
              {fmtHours(v.horasSemInteracao)}
            </span>
          </div>
          <div className="mini">
            <span className="faint" style={{ fontSize: 12 }}>1º contato</span>
            <span className="num" style={{ fontSize: 18 }}>{v.primeiroContatoMin !== null ? fmtMinutes(v.primeiroContatoMin) : '—'}</span>
          </div>
          <div className="mini">
            <span className="faint" style={{ fontSize: 12 }}>Próximo passo</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{proximo}</span>
          </div>
        </div>

        <div className="mini" style={{ gap: 10, fontSize: 14 }}>
          <div className="between"><span className="faint">Vendedor</span><span>{nome(v.vendedorId)}</span></div>
          <div className="between"><span className="faint">Recebido</span><span>{fmtDateTime(v.atribuidoEm)}</span></div>
          <div className="between"><span className="faint">Origem</span><span>{CANAL_LABEL[v.lead.canal]}</span></div>
          <div className="between"><span className="faint">Campanha</span><span className="mono" style={{ fontSize: 13 }}>{v.lead.utmCampaign ?? '—'}</span></div>
          <div className="between"><span className="faint">ID no CRM</span><span className="mono" style={{ fontSize: 13 }}>{v.lead.id}</span></div>
        </div>

        <div className="stack">
          <span className="eyebrow" style={{ marginBottom: 12 }}>Linha do tempo</span>
          {eventos.map((e, i) => (
            <div className="timeline-item" key={i}>
              <div className="timeline-rail">
                <span className={`dot ${e.nivel === 2 ? 'dot--red' : e.nivel === 1 ? 'dot--amber' : 'dot--gray'}`} style={{ marginTop: 5 }} />
                {i < eventos.length - 1 && <span className="line" />}
              </div>
              <div className="stack gap-4" style={{ paddingBottom: 16 }}>
                <span className="mono faint" style={{ fontSize: 12 }}>{fmtDateTime(e.em)}</span>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: e.nivel === 2 ? 'var(--accent-text)' : e.nivel === 1 ? 'var(--amber-text)' : 'var(--text)' }}>{e.texto}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="stack gap-8" style={{ marginTop: 'auto' }}>
          <span className="faint" style={{ fontSize: 12 }}>
            As ações abaixo são executadas no CRM. Aqui o painel só mostra o atalho.
          </span>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn btn--primary" style={{ flex: '1 1 200px' }}>
              Enviar WhatsApp pelo CRM
            </button>
            <button type="button" className="btn btn--ghost" style={{ flex: '1 1 160px' }}>
              Abrir no CRM
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
