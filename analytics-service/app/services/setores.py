# app/services/setores.py
from app.services.cascata import carregar_dados_consolidados, acao_pertence_ao_setor, SETORES_RADAR

MACRO_SETORES_CONFIG = SETORES_RADAR

async def obter_distribuicao_setores(setor_selecionado: str = None):
    """
    VISÃO 5: Desempenho por Setores ('Lente de Setor').
    Permite visualizar e comparar o desempenho dos 4 macro-setores e subsetores,
    ou aplicar uma lente em um setor específico para reuniões executivas.
    """
    acoes = await carregar_dados_consolidados()

    # Mapeia cada ação para todos os seus setores declarados
    setores_map = {}
    for a in acoes:
        for s in a["setores"]:
            s_clean = s.strip()
            if not s_clean:
                continue
            setores_map.setdefault(s_clean, []).append(a)

    def montar_item(chave, rotulo, pai, acoes_setor):
        total = len(acoes_setor)
        return {
            "setor": chave,
            "rotulo": rotulo,
            "pai": pai,
            "progresso": round(sum(a["progresso"] for a in acoes_setor) / total) if total > 0 else 0,
            "totalAcoes": total,
            "acoesConcluidas": sum(1 for a in acoes_setor if a["progresso"] == 100),
            "acoesEmAndamento": sum(1 for a in acoes_setor if 0 < a["progresso"] < 100),
            "acoesNaoIniciadas": sum(1 for a in acoes_setor if a["progresso"] == 0)
        }

    resultado_setores = []
    for cfg in SETORES_RADAR:
        chave = cfg["chave"]
        acoes_setor = list(setores_map.get(chave, []))
        # A Secretaria-Executiva consolida também as ações dos seus núcleos.
        for filho in SETORES_RADAR:
            if filho["pai"] == chave:
                for a in setores_map.get(filho["chave"], []):
                    if a not in acoes_setor:
                        acoes_setor.append(a)
        resultado_setores.append(montar_item(chave, cfg["rotulo"], cfg["pai"], acoes_setor))

    # Setores fora da lista oficial (ex: "Não Classificado") continuam visíveis.
    oficiais = {cfg["chave"] for cfg in SETORES_RADAR}
    for chave, acoes_setor in setores_map.items():
        if chave not in oficiais:
            resultado_setores.append(montar_item(chave, chave, None, acoes_setor))


    # Detalhamento do setor selecionado para a "Lente de Setor"
    detalhes_lente = None
    if setor_selecionado:
        acoes_lente = [a for a in acoes if acao_pertence_ao_setor(a, setor_selecionado)]
        
        if acoes_lente:
            total_lente = len(acoes_lente)
            progresso_lente = round(sum(a["progresso"] for a in acoes_lente) / total_lente)
            
            # Distribuição das ações desse setor por Eixo
            dist_eixos = {1: 0, 2: 0, 3: 0, 4: 0}
            for a in acoes_lente:
                dist_eixos[a["eixoNumero"]] = dist_eixos.get(a["eixoNumero"], 0) + 1

            detalhes_lente = {
                "setor": setor_selecionado,
                "totalAcoes": total_lente,
                "progresso": progresso_lente,
                "distribuicaoPorEixo": dist_eixos,
                "acoes": [
                    {
                        "id": a["id"],
                        "diretriz": a["diretriz"],
                        "meta": a["meta"],
                        "prazo": a["prazo"],
                        "projeto": f"{a['projetoCodigo']}: {a['projetoNome']}",
                        "progresso": a["progresso"],
                        "status": a["statusExecucao"]
                    }
                    for a in acoes_lente
                ]
            }

    return {
        "macroSetoresConfig": MACRO_SETORES_CONFIG,
        "setores": resultado_setores,
        "lenteSetor": detalhes_lente
    }