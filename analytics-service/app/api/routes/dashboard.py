from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.resumo import obter_resumo_geral
from app.services.eixos import obter_avanco_eixos
from app.services.projetos import obter_distribuicao_projetos
from app.services.objetivos import obter_distribuicao_objetivos
from app.services.prazos import obter_distribuicao_prazos
from app.services.setores import obter_distribuicao_setores
from app.services.cascata import alternar_projeto_estrategico

class ToggleEstrategicoRequest(BaseModel):
    codigo: str
    isEstrategico: bool
    usuarioEmail: Optional[str] = None

router = APIRouter(prefix="/analytics", tags=["Analytics PETRANS"])

@router.post("/projetos/toggle-estrategico")
async def post_toggle_estrategico(body: ToggleEstrategicoRequest):
    """Permite que ADMIN e ADMIN_SETOR definam se um projeto é Estratégico (estrela) ou não."""
    if not body.codigo:
        raise HTTPException(status_code=400, detail="Código do projeto é obrigatório.")
    return await alternar_projeto_estrategico(
        codigo=body.codigo,
        is_estrategico=body.isEstrategico,
        usuario_email=body.usuarioEmail
    )

@router.get("/resumo")
async def get_resumo(setor: Optional[str] = Query(None, description="Filtro opcional por setor (Lente de Setor)")):
    """Retorna o resumo executivo integrado com as 5 visões do PETRANS."""
    return await obter_resumo_geral(setor_filtro=setor)

@router.get("/eixos")
async def get_eixos(setor: Optional[str] = Query(None, description="Filtro opcional por setor")):
    """VISÃO 1: Avanço por Eixos (4 Eixos do PETRANS com percentual e contagens)."""
    return await obter_avanco_eixos(setor_filtro=setor)

@router.get("/projetos")
async def get_projetos(
    setor: Optional[str] = Query(None, description="Filtro opcional por setor"),
    apenasEstrategicos: bool = Query(False, description="Se True, filtra apenas os 8 projetos estratégicos")
):
    """VISÃO 2: Todos os 21 Projetos do PETRANS com destaque nos 8 Estratégicos."""
    return await obter_distribuicao_projetos(setor_filtro=setor, apenas_estrategicos=apenasEstrategicos)

@router.get("/objetivos")
async def get_objetivos(setor: Optional[str] = Query(None, description="Filtro opcional por setor")):
    """VISÃO 3: Progresso por Objetivos Gerais (OG) e Linhas de Ação (LAE)."""
    return await obter_distribuicao_objetivos(setor_filtro=setor)

@router.get("/prazos")
async def get_prazos(
    horizonte: Optional[str] = Query(None, description="Filtro por horizonte: CURTO, MEDIO ou LONGO"),
    setor: Optional[str] = Query(None, description="Filtro opcional por setor")
):
    """VISÃO 4: Ações vs. Metas por Horizontes de Prazo (Curto, Médio e Longo)."""
    return await obter_distribuicao_prazos(horizonte_filtro=horizonte, setor_filtro=setor)

@router.get("/setores")
async def get_setores(
    setor: Optional[str] = Query(None, description="Lente de Setor: filtra e detalha um setor específico")
):
    """VISÃO 5: Desempenho por Setores (Macro-setores e subsetores do CETRAN-PA)."""
    return await obter_distribuicao_setores(setor_selecionado=setor)