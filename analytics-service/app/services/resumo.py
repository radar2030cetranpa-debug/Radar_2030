# app/services/resumo.py
from app.services.cascata import acao_pertence_ao_setor
from app.services.cascata import carregar_dados_consolidados
from app.services.eixos import obter_avanco_eixos
from app.services.projetos import obter_distribuicao_projetos
from app.services.prazos import obter_distribuicao_prazos
from app.services.setores import obter_distribuicao_setores

async def obter_resumo_geral(setor_filtro: str = None):
    """
    Retorna o resumo executivo unificado contemplando as 5 visões estratégicas do PETRANS.
    """
    dados_eixos = await obter_avanco_eixos(setor_filtro=setor_filtro)
    dados_projetos = await obter_distribuicao_projetos(setor_filtro=setor_filtro)
    dados_prazos = await obter_distribuicao_prazos(setor_filtro=setor_filtro)
    dados_setores = await obter_distribuicao_setores(setor_selecionado=setor_filtro)

    acoes = await carregar_dados_consolidados()
    if setor_filtro:
        acoes = [a for a in acoes if acao_pertence_ao_setor(a, setor_filtro)]

    total_acoes = len(acoes)
    concluidas = sum(1 for a in acoes if a["progresso"] == 100)
    em_andamento = sum(1 for a in acoes if 0 < a["progresso"] < 100)
    nao_iniciadas = sum(1 for a in acoes if a["progresso"] == 0)

    return {
        "kpis": {
            "progressoGlobal": dados_eixos["progressoGlobal"],
            "totalAcoes": total_acoes,
            "acoesConcluidas": concluidas,
            "acoesEmAndamento": em_andamento,
            "acoesNaoIniciadas": nao_iniciadas,
            "totalProjetos": dados_projetos["totalProjetos"],
            "totalProjetosEstrategicos": dados_projetos["totalEstrategicos"],
            "progressoMedioEstrategicos": dados_projetos["progressoMedioEstrategicos"]
        },
        "visao1_eixos": dados_eixos["eixos"],
        "visao2_projetos": dados_projetos["projetos"],
        "visao4_prazos": dados_prazos["faixas"],
        "visao5_setores": dados_setores["setores"],
        "lenteSetor": dados_setores.get("lenteSetor")
    }