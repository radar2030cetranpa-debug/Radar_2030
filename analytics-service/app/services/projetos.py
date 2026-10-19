# app/services/projetos.py
from app.services.cascata import acao_pertence_ao_setor
from app.services.cascata import carregar_dados_consolidados, EIXOS_INFO

async def obter_distribuicao_projetos(setor_filtro: str = None, apenas_estrategicos: bool = False):
    """
    VISÃO 2: Todos os Projetos com Destaque nos 8 Estratégicos.
    Calcula o progresso de cada um dos 21 projetos com base nas etapas de suas ações.
    """
    acoes = await carregar_dados_consolidados()

    # Filtro de setor
    if setor_filtro:
        acoes = [a for a in acoes if acao_pertence_ao_setor(a, setor_filtro)]

    # Agrupamento por projetoCodigo
    projetos_map = {}
    for a in acoes:
        p_cod = a["projetoCodigo"]
        if p_cod not in projetos_map:
            projetos_map[p_cod] = {
                "codigo": p_cod,
                "nome": a["projetoNome"],
                "tema": a["projetoTema"],
                "isEstrategico": a["isEstrategico"],
                "eixoNumero": a["eixoNumero"],
                "acoes": []
            }
        projetos_map[p_cod]["acoes"].append(a)

    resultado = []
    for p_cod, p_info in projetos_map.items():
        if apenas_estrategicos and not p_info["isEstrategico"]:
            continue

        acoes_proj = p_info["acoes"]
        total = len(acoes_proj)
        progresso = round(sum(a["progresso"] for a in acoes_proj) / total) if total > 0 else 0
        concluidas = sum(1 for a in acoes_proj if a["progresso"] == 100)
        em_andamento = sum(1 for a in acoes_proj if 0 < a["progresso"] < 100)
        nao_iniciadas = sum(1 for a in acoes_proj if a["progresso"] == 0)

        eixo_info = EIXOS_INFO.get(p_info["eixoNumero"], {})

        resultado.append({
            "codigo": p_cod,
            "nome": p_info["nome"],
            "tema": p_info["tema"],
            "isEstrategico": p_info["isEstrategico"],
            "eixoNumero": p_info["eixoNumero"],
            "eixoNome": eixo_info.get("nome", "Eixo Geral"),
            "eixoCor": eixo_info.get("cor", "#2563eb"),
            "progresso": progresso,
            "totalAcoes": total,
            "acoesConcluidas": concluidas,
            "acoesEmAndamento": em_andamento,
            "acoesNaoIniciadas": nao_iniciadas
        })

    # Ordenação: Projetos Estratégicos primeiro, depois por código numérico
    def chave_ordenacao(item):
        estrategico_rank = 0 if item["isEstrategico"] else 1
        return (estrategico_rank, item["codigo"])

    resultado.sort(key=chave_ordenacao)

    total_estrategicos = sum(1 for p in resultado if p["isEstrategico"])
    progresso_medio_estrategicos = 0
    if total_estrategicos > 0:
        progresso_medio_estrategicos = round(
            sum(p["progresso"] for p in resultado if p["isEstrategico"]) / total_estrategicos
        )

    return {
        "totalProjetos": len(resultado),
        "totalEstrategicos": total_estrategicos,
        "progressoMedioEstrategicos": progresso_medio_estrategicos,
        "projetos": resultado
    }