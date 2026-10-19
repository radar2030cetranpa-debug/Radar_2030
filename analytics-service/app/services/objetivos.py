# app/services/objetivos.py
from app.services.cascata import acao_pertence_ao_setor
from app.services.cascata import carregar_dados_consolidados, EIXOS_INFO

async def obter_distribuicao_objetivos(setor_filtro: str = None):
    """
    VISÃO 3: Por Objetivos e Linhas de Ação.
    Calcula o progresso sob a ótica dos Objetivos Gerais (OG) e Linhas de Ação (LAE),
    considerando que um mesmo objetivo pode englobar mais de um projeto.
    """
    acoes = await carregar_dados_consolidados()

    if setor_filtro:
        acoes = [a for a in acoes if acao_pertence_ao_setor(a, setor_filtro)]

    por_og = {}
    por_lae = {}

    for a in acoes:
        og_chave = a["og"]
        lae_chave = a["lae"]

        # Agrupamento por OG
        if og_chave not in por_og:
            por_og[og_chave] = {
                "codigo": og_chave,
                "eixoNumero": a["eixoNumero"],
                "projetos": set(),
                "acoes": []
            }
        por_og[og_chave]["acoes"].append(a)
        if a["projetoCodigo"]:
            por_og[og_chave]["projetos"].add(f"{a['projetoCodigo']}: {a['projetoNome']}")

        # Agrupamento por LAE
        if lae_chave not in por_lae:
            por_lae[lae_chave] = {
                "codigo": lae_chave,
                "eixoNumero": a["eixoNumero"],
                "og": og_chave,
                "acoes": []
            }
        por_lae[lae_chave]["acoes"].append(a)

    lista_og = []
    for og_cod, info in por_og.items():
        total = len(info["acoes"])
        progresso = round(sum(a["progresso"] for a in info["acoes"]) / total) if total > 0 else 0
        eixo_info = EIXOS_INFO.get(info["eixoNumero"], {})

        lista_og.append({
            "codigo": og_cod,
            "eixoNumero": info["eixoNumero"],
            "eixoNome": eixo_info.get("nome", "Eixo Geral"),
            "eixoCor": eixo_info.get("cor", "#2563eb"),
            "projetosContribuintes": sorted(list(info["projetos"])),
            "totalProjetos": len(info["projetos"]),
            "progresso": progresso,
            "totalAcoes": total,
            "acoesConcluidas": sum(1 for a in info["acoes"] if a["progresso"] == 100),
            "acoesEmAndamento": sum(1 for a in info["acoes"] if 0 < a["progresso"] < 100),
            "acoesNaoIniciadas": sum(1 for a in info["acoes"] if a["progresso"] == 0)
        })

    lista_og.sort(key=lambda x: x["codigo"])

    lista_lae = []
    for lae_cod, info in por_lae.items():
        total = len(info["acoes"])
        progresso = round(sum(a["progresso"] for a in info["acoes"]) / total) if total > 0 else 0
        eixo_info = EIXOS_INFO.get(info["eixoNumero"], {})

        lista_lae.append({
            "codigo": lae_cod,
            "og": info["og"],
            "eixoNumero": info["eixoNumero"],
            "eixoNome": eixo_info.get("nome", "Eixo Geral"),
            "progresso": progresso,
            "totalAcoes": total
        })

    lista_lae.sort(key=lambda x: x["codigo"])

    return {
        "totalObjetivos": len(lista_og),
        "totalLinhasAcao": len(lista_lae),
        "objetivos": lista_og,
        "linhasAcao": lista_lae
    }
