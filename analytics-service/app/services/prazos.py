# app/services/prazos.py
from app.services.cascata import acao_pertence_ao_setor
from app.services.cascata import carregar_dados_consolidados

HORIZONTES_INFO = {
    "CURTO": {
        "codigo": "CURTO",
        "rotulo": "Curto Prazo (até 12 meses)",
        "descricao": "Ações com meta de entrega até Maio/2027",
        "cor": "#16a34a"
    },
    "MEDIO": {
        "codigo": "MEDIO",
        "rotulo": "Médio Prazo (12 a 36 meses)",
        "descricao": "Ações com meta de entrega entre 2027 e 2029",
        "cor": "#2563eb"
    },
    "LONGO": {
        "codigo": "LONGO",
        "rotulo": "Longo Prazo (36+ meses)",
        "descricao": "Ações estruturantes de horizonte 2029 a 2030",
        "cor": "#7c3aed"
    }
}

async def obter_distribuicao_prazos(horizonte_filtro: str = None, setor_filtro: str = None):
    """
    VISÃO 4: Ações vs. Metas por Horizontes de Prazo.
    Filtro e análise por 3 faixas temporais: Curto Prazo, Médio Prazo e Longo Prazo.
    """
    acoes = await carregar_dados_consolidados()

    if setor_filtro:
        acoes = [a for a in acoes if acao_pertence_ao_setor(a, setor_filtro)]

    por_horizonte = {"CURTO": [], "MEDIO": [], "LONGO": []}
    for a in acoes:
        h = a["prazoNormalizado"]
        if h in por_horizonte:
            por_horizonte[h].append(a)
        else:
            por_horizonte["CURTO"].append(a)

    resultado_faixas = []
    for h_key in ["CURTO", "MEDIO", "LONGO"]:
        info = HORIZONTES_INFO[h_key]
        acoes_h = por_horizonte[h_key]
        total = len(acoes_h)
        progresso = round(sum(a["progresso"] for a in acoes_h) / total) if total > 0 else 0
        concluidas = sum(1 for a in acoes_h if a["progresso"] == 100)
        em_andamento = sum(1 for a in acoes_h if 0 < a["progresso"] < 100)
        nao_iniciadas = sum(1 for a in acoes_h if a["progresso"] == 0)

        resultado_faixas.append({
            "codigo": h_key,
            "rotulo": info["rotulo"],
            "descricao": info["descricao"],
            "cor": info["cor"],
            "progressoAcumulado": progresso,
            "totalAcoes": total,
            "acoesConcluidas": concluidas,
            "acoesEmAndamento": em_andamento,
            "acoesNaoIniciadas": nao_iniciadas
        })

    # Se um horizonte específico for solicitado, retorna também a lista de ações daquele horizonte
    acoes_filtradas = []
    if horizonte_filtro:
        h_upper = horizonte_filtro.upper()
        acoes_filtradas = [
            {
                "id": a["id"],
                "diretriz": a["diretriz"],
                "meta": a["meta"],
                "projeto": f"{a['projetoCodigo']}: {a['projetoNome']}",
                "setor": a["setorPrincipal"],
                "progresso": a["progresso"],
                "status": a["statusExecucao"],
                "etapas": a["etapas"]
            }
            for a in acoes if a["prazoNormalizado"] == h_upper
        ]

    return {
        "faixas": resultado_faixas,
        "acoesDetalhadas": acoes_filtradas if horizonte_filtro else []
    }