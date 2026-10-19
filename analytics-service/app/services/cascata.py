# app/services/cascata.py
import json
import re
import unicodedata
from app.database.connection import get_db_connection

# Mapeamento oficial dos 4 Eixos (Radar 2030)
EIXOS_INFO = {
    1: {
        "id": 1,
        "codigo": "EIXO 1",
        "nome": "Integração",
        "sigla": "INT",
        "cor": "#2563eb"
    },
    2: {
        "id": 2,
        "codigo": "EIXO 2",
        "nome": "Inteligência de dados e Comunicação",
        "sigla": "IDC",
        "cor": "#16a34a"
    },
    3: {
        "id": 3,
        "codigo": "EIXO 3",
        "nome": "Gestão e Fiscalização",
        "sigla": "GF",
        "cor": "#d97706"
    },
    4: {
        "id": 4,
        "codigo": "EIXO 4",
        "nome": "Cultura e Educação",
        "sigla": "CE",
        "cor": "#7c3aed"
    }
}

# Projetos por Eixo, conforme a Nota para Ratificação (Radar 2030).
# O eixo da ação passa a ser definido pelo projeto a que ela pertence.
PROJETOS_POR_EIXO = {
    1: [1, 2, 11, 14, 18, 21],
    2: [3, 4, 10, 13],
    3: [5, 6, 7, 12, 15, 17, 19, 20],
    4: [8, 9, 16],
}
EIXO_POR_PROJETO = {p: eixo for eixo, projetos in PROJETOS_POR_EIXO.items() for p in projetos}

def eixo_do_projeto(projeto_codigo):
    """Retorna o número do eixo do projeto (ex: 'PROJETO 02' -> 1) ou None."""
    m = re.search(r"(\d+)", projeto_codigo or "")
    return EIXO_POR_PROJETO.get(int(m.group(1))) if m else None

# Setores do Radar 2030. Os núcleos pertencem à Secretaria-Executiva.
SETORES_RADAR = [
    {"chave": "Presidência", "rotulo": "Presidência", "pai": None},
    {"chave": "Secretaria-Executiva", "rotulo": "Secretaria-Executiva", "pai": None},
    {"chave": "Núcleo Administrativo", "rotulo": "Núcleo Administrativo", "pai": "Secretaria-Executiva"},
    {"chave": "Núcleo Recursos", "rotulo": "Núcleo Recursos", "pai": "Secretaria-Executiva"},
    {"chave": "Núcleo GeoCetran", "rotulo": "Núcleo GeoCetran", "pai": "Secretaria-Executiva"},
    {"chave": "Núcleo ICetran", "rotulo": "Núcleo ICetran", "pai": "Secretaria-Executiva"},
    {"chave": "Núcleo JusCetran", "rotulo": "Núcleo JusCetran", "pai": "Secretaria-Executiva"},
    {"chave": "CTSEG", "rotulo": "CTSEG - Comissão Temática de Segurança Viária", "pai": None},
    {"chave": "CTSIST", "rotulo": "CTSIST - Comissão Temática de Sistema de Trânsito", "pai": None},
    {"chave": "CTEDUC", "rotulo": "CTEDUC - Comissão Temática de Educação para o Trânsito", "pai": None},
]

_ALIASES_SETOR = {
    "presidencia": "Presidência",
    "presidencia do cetran": "Presidência",
    "secretaria executiva": "Secretaria-Executiva",
    "secretaria nexecutiva": "Secretaria-Executiva",
    "sec exec": "Secretaria-Executiva",
    "secexec": "Secretaria-Executiva",
    "nucleo administrativo": "Núcleo Administrativo",
    "nucleo recursos": "Núcleo Recursos",
    "nucleo geocetran": "Núcleo GeoCetran",
    "geocetran": "Núcleo GeoCetran",
    "nucleo icetran": "Núcleo ICetran",
    "icetran": "Núcleo ICetran",
    "nucleo juscetran": "Núcleo JusCetran",
    "juscetran": "Núcleo JusCetran",
    "ctseg": "CTSEG",
    "ctsist": "CTSIST",
    "cteduc": "CTEDUC",
}

def normalizar_setor(texto):
    """Converte variações de escrita para o nome oficial do setor; desconhecidos ficam como estão."""
    original = (texto or "").strip()
    if not original:
        return original
    sem_acento = unicodedata.normalize("NFKD", original).encode("ascii", "ignore").decode()
    chave = re.sub(r"[^a-z0-9]+", " ", sem_acento.lower()).strip()
    return _ALIASES_SETOR.get(chave, original)

def setores_do_grupo(setor):
    """O setor e, se for a Secretaria-Executiva, também os seus núcleos."""
    chave = normalizar_setor(setor)
    return {chave} | {s["chave"] for s in SETORES_RADAR if s["pai"] == chave}

def acao_pertence_ao_setor(acao, setor_selecionado):
    """Filtro da Lente de Setor. A Secretaria-Executiva inclui as ações dos seus núcleos."""
    if any(s in setores_do_grupo(setor_selecionado) for s in acao["setores"]):
        return True
    # Seleção fora da lista oficial: mantém a busca por trecho do nome.
    chave = normalizar_setor(setor_selecionado)
    if any(c["chave"] == chave for c in SETORES_RADAR):
        return False
    texto = (setor_selecionado or "").strip().upper()
    return bool(texto) and any(texto in s.upper() for s in acao["setores"])

# Os 8 Projetos Estratégicos Estruturantes padrão do PETRANS (ponto de partida)
PROJETOS_ESTRATEGICOS_PADRAO = {
    "PROJETO 01",  # PETRANS
    "PROJETO 04",  # Observatório Estadual de Segurança Viária
    "PROJETO 05",  # GTIP Trânsito
    "PROJETO 07",  # Reestruturação do Conselho
    "PROJETO 12",  # Autonomia financeira Cetran/PA
    "PROJETO 16",  # Escola Pública de Trânsito
    "PROJETO 17",  # Compliance e Combate ao Crime e à Corrupção
    "PROJETO 21",  # Centro Integrado de Operações de Trânsito
}

async def obter_projetos_estrategicos_set(conn) -> set:
    """
    Recupera do banco de dados quais projetos estão com a estrela / status de Estratégico.
    Se a tabela ainda não existir ou estiver vazia, cria e inicializa com os 8 padrões.
    """
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS "ProjetoEstrategico" (
                "codigo" VARCHAR(50) PRIMARY KEY,
                "isEstrategico" BOOLEAN NOT NULL DEFAULT TRUE,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedBy" VARCHAR(150)
            );
        """)

        linhas = await conn.fetch('SELECT "codigo", "isEstrategico" FROM "ProjetoEstrategico";')
        if not linhas:
            # Inicializa com os 8 padrões
            for cod in PROJETOS_ESTRATEGICOS_PADRAO:
                await conn.execute(
                    'INSERT INTO "ProjetoEstrategico" ("codigo", "isEstrategico", "updatedBy") VALUES ($1, TRUE, $2) ON CONFLICT DO NOTHING;',
                    cod, "sistema_inicializacao"
                )
            return set(PROJETOS_ESTRATEGICOS_PADRAO)

        return {row["codigo"] for row in linhas if row["isEstrategico"]}
    except Exception as e:
        print(f"Aviso ao consultar ProjetoEstrategico: {e}")
        return set(PROJETOS_ESTRATEGICOS_PADRAO)

async def alternar_projeto_estrategico(codigo: str, is_estrategico: bool, usuario_email: str = None) -> dict:
    """
    Permite que Administradores (ADMIN e ADMIN_SETOR) marquem ou desmarquem a estrela / destaque de um projeto.
    """
    conn = await get_db_connection()
    try:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS "ProjetoEstrategico" (
                "codigo" VARCHAR(50) PRIMARY KEY,
                "isEstrategico" BOOLEAN NOT NULL DEFAULT TRUE,
                "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "updatedBy" VARCHAR(150)
            );
        """)

        await conn.execute("""
            INSERT INTO "ProjetoEstrategico" ("codigo", "isEstrategico", "updatedAt", "updatedBy")
            VALUES ($1, $2, NOW(), $3)
            ON CONFLICT ("codigo")
            DO UPDATE SET "isEstrategico" = $2, "updatedAt" = NOW(), "updatedBy" = $3;
        """, codigo, is_estrategico, usuario_email or "admin")

        return {
            "codigo": codigo,
            "isEstrategico": is_estrategico,
            "sucesso": True
        }
    finally:
        await conn.close()


def extrair_numero_eixo(og: str, lae: str) -> int:
    """Identifica a qual dos 4 Eixos a ação pertence com base no OG ou LAE."""
    for texto in [og, lae]:
        if not texto:
            continue
        texto_limpo = texto.upper().replace(" ", "")
        if "OG1" in texto_limpo or "LAE1" in texto_limpo:
            return 1
        if "OG2" in texto_limpo or "LAE2" in texto_limpo:
            return 2
        if "OG3" in texto_limpo or "LAE3" in texto_limpo:
            return 3
        if "OG4" in texto_limpo or "LAE4" in texto_limpo:
            return 4
    return 1

def normalizar_prazo(prazo: str) -> str:
    """Padroniza a faixa de prazo da ação."""
    if not prazo:
        return "CURTO"
    p = prazo.upper()
    if "CURTO" in p:
        return "CURTO"
    if "MEDIO" in p or "MÉDIO" in p:
        return "MEDIO"
    if "LONGO" in p:
        return "LONGO"
    return "CURTO"

def _carregar_lista_etapas(etapas_raw):
    """Converte o JSON de etapas (lista ou string) em lista de dicts."""
    etapas = etapas_raw
    if isinstance(etapas_raw, str):
        try:
            etapas = json.loads(etapas_raw)
        except Exception:
            return []
    if not isinstance(etapas, list):
        return []
    return [e for e in etapas if isinstance(e, dict)]

def _tarefas_da_etapa(etapa):
    tarefas = etapa.get("tarefas")
    if not isinstance(tarefas, list):
        return []
    return [t for t in tarefas if isinstance(t, dict)]

def calcular_percentual_etapa(etapa) -> int:
    """
    Percentual de uma etapa: tarefas concluídas / total de tarefas.
    Etapas legadas (sem tarefas) contam 0% ou 100% pelo campo "concluida".
    """
    tarefas = _tarefas_da_etapa(etapa)
    if tarefas:
        concluidas = sum(1 for t in tarefas if t.get("concluida") is True)
        return round((concluidas / len(tarefas)) * 100)
    return 100 if etapa.get("concluida") is True else 0

def calcular_percentual_etapas(etapas_raw) -> int:
    """Percentual de uma ação: média simples do percentual de suas etapas."""
    etapas = _carregar_lista_etapas(etapas_raw)
    if not etapas:
        return 0
    return round(sum(calcular_percentual_etapa(e) for e in etapas) / len(etapas))

def normalizar_etapas(etapas_raw):
    """Retorna as etapas (com contagem de tarefas) em um formato seguro para a API."""
    resultado = []
    for indice, etapa in enumerate(_carregar_lista_etapas(etapas_raw)):
        tarefas = _tarefas_da_etapa(etapa)
        percentual = calcular_percentual_etapa(etapa)
        resultado.append({
            "id": etapa.get("id") or f"etapa-{indice}",
            "titulo": etapa.get("titulo") or f"Etapa {indice + 1}",
            "impacto": etapa.get("impacto"),
            "totalTarefas": len(tarefas),
            "tarefasConcluidas": sum(1 for t in tarefas if t.get("concluida") is True),
            "percentual": percentual,
            "concluida": percentual == 100
        })
    return resultado

async def carregar_dados_consolidados():
    """
    Carrega todas as ações do banco e cruza com as matrizes APROVADAS
    para gerar o mapa de progresso individual de cada ação.
    """
    conn = await get_db_connection()
    try:
        # 1. Busca todas as ações estratégicas cadastradas
        query_acoes = """
            SELECT 
                id, diretriz, prazo, meta, indicador, setor,
                og, lae, "projetoCodigo", "projetoNome", "projetoTema"
            FROM "Acao"
            ORDER BY id ASC;
        """
        acoes_db = await conn.fetch(query_acoes)

        # 2. Busca os checklists de etapas das matrizes APROVADAS
        query_matrizes = """
            SELECT 
                am."acaoId",
                am.etapas,
                m."dataCriacao"
            FROM "AcoesMatriz" am
            INNER JOIN "Matriz" m ON m.id = am."matrizId"
            WHERE m.status = 'APROVADO'
            ORDER BY m."dataCriacao" ASC;
        """
        etapas_matrizes = await conn.fetch(query_matrizes)

        # Mapeia o percentual calculado por ação (a mais recente sobrescreve se houver duplicação)
        percentual_por_acao = {}
        etapas_por_acao = {}
        for row in etapas_matrizes:
            acao_id = row["acaoId"]
            etapas = row["etapas"]
            percentual_por_acao[acao_id] = calcular_percentual_etapas(etapas)
            etapas_por_acao[acao_id] = normalizar_etapas(etapas)

        # 3. Busca a configuração de projetos estratégicos (definida pelos Administradores)
        estrategicos_set = await obter_projetos_estrategicos_set(conn)

        # Monta a lista enriquecida de todas as ações
        acoes_consolidadas = []
        for a in acoes_db:
            acao_id = a["id"]
            progresso = percentual_por_acao.get(acao_id, 0)
            proj_cod_eixo = a["projetoCodigo"]
            eixo_num = eixo_do_projeto(proj_cod_eixo) or extrair_numero_eixo(a["og"], a["lae"])
            prazo_norm = normalizar_prazo(a["prazo"])
            proj_cod = a["projetoCodigo"] or "SEM_PROJETO"
            proj_nome = a["projetoNome"] or proj_cod
            
            # Divide múltiplos setores se houver vírgula
            setores_lista = []
            for s in (a["setor"] or "").split(","):
                nome_setor = normalizar_setor(s)
                if nome_setor and nome_setor not in setores_lista:
                    setores_lista.append(nome_setor)
            if not setores_lista:
                setores_lista = ["Não Classificado"]

            acoes_consolidadas.append({
                "id": acao_id,
                "diretriz": a["diretriz"],
                "prazo": a["prazo"],
                "prazoNormalizado": prazo_norm,
                "meta": a["meta"],
                "indicador": a["indicador"],
                "setores": setores_lista,
                "setorPrincipal": setores_lista[0],
                "og": a["og"] or "Geral",
                "lae": a["lae"] or "Geral",
                "eixoNumero": eixo_num,
                "projetoCodigo": proj_cod,
                "projetoNome": proj_nome,
                "projetoTema": a["projetoTema"] or "",
                "isEstrategico": proj_cod in estrategicos_set,
                "progresso": progresso,
                "etapas": etapas_por_acao.get(acao_id, []),
                "statusExecucao": "CONCLUIDA" if progresso == 100 else ("EM_ANDAMENTO" if progresso > 0 else "NAO_INICIADA")
            })

        return acoes_consolidadas
    finally:
        await conn.close()
