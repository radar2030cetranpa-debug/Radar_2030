# app/services/eixos.py
from app.services.cascata import acao_pertence_ao_setor
from app.services.cascata import carregar_dados_consolidados, EIXOS_INFO

async def obter_avanco_eixos(setor_filtro: str = None):
    """
    VISÃO 1: Avanço por Eixos.
    Retorna o percentual consolidado e métricas dos 4 Eixos do PETRANS.
    Suporta filtro opcional por setor ('Lente de Setor').
    """
    acoes = await carregar_dados_consolidados()

    # Aplica filtro de setor se solicitado
    if setor_filtro:
        acoes = [a for a in acoes if acao_pertence_ao_setor(a, setor_filtro)]

    # Agrupa ações por número de Eixo (1 a 4)
    por_eixo = {1: [], 2: [], 3: [], 4: []}
    for a in acoes:
        eixo_num = a["eixoNumero"]
        if eixo_num in por_eixo:
            por_eixo[eixo_num].append(a)

    resultado = []
    total_acoes_geral = len(acoes)
    soma_progresso_geral = sum(a["progresso"] for a in acoes) if total_acoes_geral > 0 else 0
    progresso_global = round(soma_progresso_geral / total_acoes_geral) if total_acoes_geral > 0 else 0

    for num in [1, 2, 3, 4]:
        info = EIXOS_INFO[num]
        acoes_do_eixo = por_eixo[num]
        total = len(acoes_do_eixo)
        
        if total > 0:
            progresso_medio = round(sum(a["progresso"] for a in acoes_do_eixo) / total)
            concluidas = sum(1 for a in acoes_do_eixo if a["progresso"] == 100)
            em_andamento = sum(1 for a in acoes_do_eixo if 0 < a["progresso"] < 100)
            nao_iniciadas = sum(1 for a in acoes_do_eixo if a["progresso"] == 0)
        else:
            progresso_medio = 0
            concluidas = 0
            em_andamento = 0
            nao_iniciadas = 0

        resultado.append({
            "eixoNumero": num,
            "codigo": info["codigo"],
            "nome": info["nome"],
            "sigla": info["sigla"],
            "cor": info["cor"],
            "progresso": progresso_medio,
            "totalAcoes": total,
            "acoesConcluidas": concluidas,
            "acoesEmAndamento": em_andamento,
            "acoesNaoIniciadas": nao_iniciadas
        })

    return {
        "progressoGlobal": progresso_global,
        "totalAcoes": total_acoes_geral,
        "eixos": resultado
    }
