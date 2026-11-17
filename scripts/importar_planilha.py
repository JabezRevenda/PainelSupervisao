"""
Importa o "Relatório de leads e conversão" (planilha de follow-up) para o painel.

Uso:
    python3 scripts/importar_planilha.py caminho/da/planilha.xlsx

Gera src/planilha/dados.json, que a versão "planilha" do painel lê
(npm run build:planilha). O arquivo fica fora do git: o repositório é
público e a planilha tem dados reais de leads e vendedores.

O que é lido de cada aba mensal de 2026 ("Janeiro 26" ... "Novembro 26"):
  - Dia a dia (colunas A, B, D, E): leads do dia, demonstrações e perdidos.
  - Resumo: "Oportunidades Geradas", "Leads Perdidas" e "Meta".
  - Lista "ID DO LEAD": um lead por linha, com comercial, data, canal,
    tipo de demonstração, se foi realizada, SDR e status. Se houver uma coluna
    "DATA GANHO" (ou "Data de fechamento"/"Data da venda"), ela também é lida e
    libera a comparação dos meses na mesma idade do lead.

Requer: openpyxl (pip install openpyxl).
"""

from __future__ import annotations

import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

MESES = {
    'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4, 'maio': 5, 'junho': 6,
    'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12,
}
NOME_MES = {v: k.capitalize() for k, v in MESES.items()}

CANAIS = {
    'organic search': 'Organic Search',
    'paid search': 'Paid Search',
    'direct': 'Direct',
    'referral': 'Referral',
    'social': 'Social',
    'indicação': 'Indicação',
    'indicacao': 'Indicação',
    'renave': 'Renave',
    'webmotors': 'Webmotors',
    'revenda mais': 'Revenda Mais',
    'webinar renave': 'Webinar Renave',
    'webinar financeiro': 'Webinar Financeiro',
    'whatsapp': 'WhatsApp',
    'e-mail': 'E-mail',
    'email': 'E-mail',
    'instagram': 'Instagram',
    'google': 'Google',
    'outros': 'Outros',
    'limbo': 'Limbo',
}

STATUS = {
    'acompanhando': 'Acompanhando',
    'negociação': 'Negociação',
    'negociacao': 'Negociação',
    'futuro': 'Futuro',
    'potencial': 'Potencial',
    'ganho': 'Ganho',
    'cadastrado': 'Cadastrado',
    'perdido': 'Perdido',
    'resgate': 'Resgate',
    'limbo': 'Limbo',
}


def sem_acento(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def limpar(v) -> str:
    return re.sub(r'\s+', ' ', str(v)).strip() if v is not None else ''


def nome_pessoa(v) -> str:
    s = limpar(v)
    return ' '.join(p[:1].upper() + p[1:] for p in s.split(' ')) if s else ''


def mes_da_aba(titulo: str):
    m = re.match(r'^\s*([A-Za-zçÇ]+)\s*(\d{2})\s*$', titulo)
    if not m:
        return None
    mes = MESES.get(m.group(1).lower())
    ano = 2000 + int(m.group(2))
    return (ano, mes) if mes and ano == 2026 else None


def data_do_lead(v, ano: int, mes: int):
    """A planilha mistura datas digitadas como texto (dd/mm/aaaa) e datas que o
    Excel leu com dia e mês trocados (03/11 virou 11 de março). O mês da aba
    resolve a ambiguidade."""
    if isinstance(v, dt.datetime):
        if v.month == mes:
            return dt.date(ano, mes, v.day)
        if v.day == mes and v.month <= 31:
            return dt.date(ano, mes, v.month)
        return None
    s = limpar(v)
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', s)
    if m:
        d, mm = int(m.group(1)), int(m.group(2))
        if mm == mes:
            return dt.date(ano, mes, d)
        if d == mes:
            return dt.date(ano, mes, mm)
    return None


def data_qualquer(v):
    """Data do ganho: pode cair em outro mês, então só aceita texto dd/mm/aaaa ou data do Excel como está."""
    if isinstance(v, dt.datetime):
        return v.date().isoformat()
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{2,4})$', limpar(v))
    if m:
        ano = int(m.group(3)) + (2000 if len(m.group(3)) == 2 else 0)
        try:
            return dt.date(ano, int(m.group(2)), int(m.group(1))).isoformat()
        except ValueError:
            return None
    return None


def procurar(ws, rotulo: str):
    alvo = sem_acento(rotulo).lower()
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, str) and sem_acento(c.value).strip().lower() == alvo:
                return c
    return None


def numero_ao_lado(ws, c, ate=6):
    for k in range(1, ate):
        v = ws.cell(c.row, c.column + k).value
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return v
    return None


def ler_aba(ws, ano: int, mes: int):
    chave = f'{ano}-{mes:02d}'

    # dia a dia
    diario = []
    for r in range(1, 40):
        a = ws.cell(r, 1).value
        if not isinstance(a, dt.datetime) or a.year != ano or a.month != mes:
            continue
        leads, demos, perdidos = ws.cell(r, 2).value, ws.cell(r, 4).value, ws.cell(r, 5).value
        num = lambda x: x if isinstance(x, (int, float)) and not isinstance(x, bool) else None  # noqa: E731
        obs = limpar(leads) if isinstance(leads, str) else ''
        diario.append({'data': a.date().isoformat(), 'leads': num(leads), 'reunioes': num(demos), 'perdidos': num(perdidos), 'obs': obs})

    oport = procurar(ws, 'Oportunidades Geradas')
    perdas = procurar(ws, 'Leads Perdidas')
    meta_c = procurar(ws, 'Meta')

    # lista de leads
    cab = procurar(ws, 'ID DO LEAD')
    leads = []
    if cab:
        col = {limpar(ws.cell(cab.row, cab.column + k).value).lower(): cab.column + k for k in range(0, 10)}
        c_real = col.get('realizada', cab.column + 5)
        # Coluna opcional com a data em que o lead virou ganho (ex.: "DATA GANHO").
        c_ganho = next((c for nome, c in col.items() if 'data' in sem_acento(nome) and any(p in sem_acento(nome) for p in ('ganho', 'fechamento', 'venda'))), None)
        for r in range(cab.row + 1, ws.max_row + 1):
            g = lambda k: ws.cell(r, cab.column + k).value  # noqa: E731
            lid, vend = g(0), g(1)
            if lid is None and vend is None:
                continue
            if not vend:
                continue
            data = data_do_lead(g(2), ano, mes)
            canal_txt = limpar(g(3))
            canal = CANAIS.get(canal_txt.lower(), canal_txt) if canal_txt else 'Sem origem'
            tipo_txt = sem_acento(limpar(g(4))).lower()
            tipo = 'negociacao_direta' if 'negociacao' in tipo_txt else 'demonstracao'
            real_txt = sem_acento(limpar(ws.cell(r, c_real).value)).lower()
            realizada = 'sim' if real_txt == 'sim' else 'nao' if real_txt == 'nao' else 'pendente'
            sdr = limpar(g(6))
            if sdr.lower() in ('ia', 'ia sdr'):
                sdr = 'IA'
            status_txt = limpar(g(7))
            status = STATUS.get(status_txt.lower(), status_txt or 'Acompanhando')
            leads.append({
                'id': str(int(lid)) if isinstance(lid, (int, float)) else limpar(lid),
                'vendedor': nome_pessoa(vend),
                'data': data.isoformat() if data else None,
                'canal': canal,
                'tipo': tipo,
                'realizada': realizada,
                'sdr': sdr or '—',
                'status': status,
                'dataGanho': data_qualquer(ws.cell(r, c_ganho).value) if c_ganho else None,
            })

    meta = numero_ao_lado(ws, meta_c) if meta_c else None
    # De agosto em diante a meta da planilha é de vendas (Concluídos = Ganho + Cadastrado).
    # Antes disso ela contava demonstrações, então não entra como meta de cadastros.
    meta_cadastros = meta if meta is not None and mes >= 8 else None

    dias_com_lead = [d for d in diario if d['leads'] is not None]
    return {
        'chave': chave,
        'nome': f'{NOME_MES[mes]} {ano}',
        'leads': numero_ao_lado(ws, oport) if oport else sum(d['leads'] or 0 for d in diario),
        'leadsAte': dias_com_lead[-1]['data'] if dias_com_lead else None,
        'perdidosDia': numero_ao_lado(ws, perdas) if perdas else None,
        'meta': meta_cadastros,
        'diario': diario,
        'lista': leads,
    }


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    origem = Path(sys.argv[1])
    wb = openpyxl.load_workbook(origem, data_only=True)
    meses = []
    for ws in wb.worksheets:
        am = mes_da_aba(ws.title)
        if am:
            meses.append(ler_aba(ws, *am))
    meses.sort(key=lambda m: m['chave'])
    datas = [l['data'] for m in meses for l in m['lista'] if l['data']]
    saida = {
        'arquivo': origem.name,
        'importadoEm': dt.datetime.now().isoformat(timespec='minutes'),
        'atualizadoAte': max(datas) if datas else None,
        'meses': meses,
    }
    destino = Path(__file__).resolve().parent.parent / 'src' / 'planilha' / 'dados.json'
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(saida, ensure_ascii=False, indent=1), encoding='utf-8')
    total = sum(len(m['lista']) for m in meses)
    print(f'{len(meses)} meses, {total} leads com reunião -> {destino}')
    for m in meses:
        sem_data = sum(1 for l in m['lista'] if not l['data'])
        print(f"  {m['nome']}: {m['leads']} leads, {len(m['lista'])} reuniões, meta {m['meta']}, leads até {m['leadsAte']}" + (f', {sem_data} sem data' if sem_data else ''))


if __name__ == '__main__':
    main()
