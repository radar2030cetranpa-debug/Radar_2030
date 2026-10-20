// src/pages/DashboardEstrategico.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    buscarResumoAnalytics,
    buscarObjetivos,
    buscarPrazos,
    alternarProjetoEstrategico
} from '../services/analytics';
import { ehAdmin } from '../services/permissoes';
import { SETORES_RADAR } from '../services/progresso';
import Swal from 'sweetalert2';

const SETORES_OPCOES = [
    { valor: '', rotulo: 'Todos os Setores (Visão Geral)' },
    ...SETORES_RADAR.map(s => ({ valor: s.chave, rotulo: s.pai ? `\u00A0\u00A0${s.rotulo}` : s.rotulo }))
];

export function DashboardEstrategico({ usuarioLogado }) {
    const [abaAtiva, setAbaAtiva] = useState('eixos'); // 'eixos' | 'projetos' | 'objetivos' | 'prazos' | 'setores'
    const [setorFiltro, setSetorFiltro] = useState('');
    const [apenasEstrategicos, setApenasEstrategicos] = useState(false);
    const [prazoSelecionado, setPrazoSelecionado] = useState('');

    const [dadosResumo, setDadosResumo] = useState(null);
    const [dadosObjetivos, setDadosObjetivos] = useState(null);
    const [dadosPrazosDetalhados, setDadosPrazosDetalhados] = useState(null);

    const [carregando, setCarregando] = useState(true);
    const [erroConexao, setErroConexao] = useState(false);

    const podeEditarEstrategico = ehAdmin(usuarioLogado);

    const carregarDados = useCallback(async () => {
        setCarregando(true);
        setErroConexao(false);
        try {
            const [resumo, objetivos, prazos] = await Promise.all([
                buscarResumoAnalytics(setorFiltro),
                buscarObjetivos(setorFiltro),
                buscarPrazos(prazoSelecionado, setorFiltro)
            ]);

            setDadosResumo(resumo);
            setDadosObjetivos(objetivos);
            setDadosPrazosDetalhados(prazos);
        } catch (err) {
            console.error('Erro ao buscar dados do Analytics FastAPI:', err);
            setErroConexao(true);
        } finally {
            setCarregando(false);
        }
    }, [setorFiltro, prazoSelecionado]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    const handleToggleEstrategico = async (projetoCodigo, statusAtual, nomeProjeto) => {
        if (!podeEditarEstrategico) return;

        const novoStatus = !statusAtual;
        const acaoTexto = novoStatus
            ? 'marcar como Projeto Estratégico ⭐'
            : 'remover o destaque de Projeto Estratégico';

        const result = await Swal.fire({
            title: novoStatus ? 'Marcar Estratégico?' : 'Remover Estratégico?',
            text: `Deseja ${acaoTexto} para "${projetoCodigo} - ${nomeProjeto}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: novoStatus ? '#ca8a04' : '#64748b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: novoStatus ? 'Sim, marcar ⭐' : 'Sim, remover',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await alternarProjetoEstrategico(projetoCodigo, novoStatus, usuarioLogado?.email);

                // Atualiza o estado local imediatamente
                setDadosResumo((prev) => {
                    if (!prev) return prev;
                    const novosProjetos = (prev.visao2_projetos || []).map((p) => {
                        if (p.codigo === projetoCodigo) {
                            return { ...p, isEstrategico: novoStatus };
                        }
                        return p;
                    });

                    const totalEstrategicos = novosProjetos.filter((p) => p.isEstrategico).length;
                    const mediaEstrategicos = totalEstrategicos > 0
                        ? Math.round(
                            novosProjetos
                                .filter((p) => p.isEstrategico)
                                .reduce((s, p) => s + p.progresso, 0) / totalEstrategicos
                        )
                        : 0;

                    return {
                        ...prev,
                        kpis: {
                            ...prev.kpis,
                            totalEstrategicos,
                            progressoMedioEstrategicos: mediaEstrategicos
                        },
                        visao2_projetos: novosProjetos
                    };
                });

                Swal.fire({
                    icon: 'success',
                    title: novoStatus ? '⭐ Projeto Estratégico Definido!' : 'Destaque removido',
                    text: `${projetoCodigo} foi atualizado com sucesso.`,
                    timer: 1600,
                    showConfirmButton: false
                });
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao alterar',
                    text: err.message || 'Não foi possível atualizar o status estratégico do projeto.',
                    confirmButtonColor: '#2563eb'
                });
            }
        }
    };

    const kpis = dadosResumo?.kpis || {};
    const semDados = !carregando && !erroConexao && dadosResumo !== null && Number(kpis.totalAcoes ?? 0) === 0;
    const eixos = dadosResumo?.visao1_eixos || [];
    const projetos = dadosResumo?.visao2_projetos || [];
    const faixasPrazos = dadosResumo?.visao4_prazos || [];
    const setores = dadosResumo?.visao5_setores || [];

    const projetosFiltrados = apenasEstrategicos 
        ? projetos.filter(p => p.isEstrategico)
        : projetos;

    return (
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1300px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header Executivo & Lente de Setor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            PETRANS 2030 • Inteligência Analítica
                        </span>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>FastAPI Engine</span>
                    </div>
                    <h1 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: 'clamp(1.8rem, 2.5vw, 2.4rem)', color: '#0f172a', fontWeight: 800 }}>
                        Dashboard Estratégico
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                        Monitoramento em cascata do plano estratégico consolidado a partir das matrizes aprovadas pelo Comitê Gestor.
                    </p>
                </div>

                {/* Filtro Lente de Setor */}
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.85rem 1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600, fontSize: '0.88rem' }}>
                        <i className="bi bi-funnel-fill" style={{ color: '#2563eb' }}></i>
                        <span>Lente de Setor:</span>
                    </div>
                    <select
                        value={setorFiltro}
                        onChange={(e) => setSetorFiltro(e.target.value)}
                        style={{ padding: '0.55rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', color: '#0f172a', background: '#f8fafc', fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                    >
                        {SETORES_OPCOES.map(op => (
                            <option key={op.valor} value={op.valor}>{op.rotulo}</option>
                        ))}
                    </select>
                    <button
                        onClick={carregarDados}
                        title="Atualizar dados"
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        <i className={`bi bi-arrow-clockwise ${carregando ? 'spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* Aviso de Erro de Conexão com a API Python */}
            {erroConexao && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#991b1b' }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '1.5rem', flexShrink: 0 }}></i>
                    <div>
                        <strong style={{ display: 'block', marginBottom: '2px' }}>Serviço Analítico em Inicialização / Offline</strong>
                        <span style={{ fontSize: '0.88rem' }}>
                            Certifique-se de que o backend FastAPI (Python) está rodando na porta 8000 (<code style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>uvicorn app.main:app --port 8000</code>).
                        </span>
                    </div>
                </div>
            )}

            {semDados ? (
                <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                    Não há dados
                </div>
            ) : (
                <>
            {/* Cards de KPIs Principais no Topo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={estiloKpiCard('#2563eb')}>
                    <span style={estiloKpiLabel}>Progresso Geral do Plano</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#0f172a', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.progressoGlobal ?? 0}%
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Média ponderada em cascata</span>
                </div>

                <div style={estiloKpiCard('#16a34a')}>
                    <span style={estiloKpiLabel}>Ações Concluídas (100%)</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#16a34a', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.acoesConcluidas ?? 0}
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>De {kpis.totalAcoes ?? 0} ações totais</span>
                </div>

                <div style={estiloKpiCard('#d97706')}>
                    <span style={estiloKpiLabel}>Ações em Andamento</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#d97706', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.acoesEmAndamento ?? 0}
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Checklist com etapas em execução</span>
                </div>

                <div style={estiloKpiCard('#7c3aed')}>
                    <span style={estiloKpiLabel}>{kpis.totalEstrategicos ?? 8} Projetos Estratégicos</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#7c3aed', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.progressoMedioEstrategicos ?? 0}%
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Avanço médio prioritário</span>
                </div>
            </div>

            {/* Barra de Abas das 5 Visões */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '2px' }}>
                <button
                    onClick={() => setAbaAtiva('eixos')}
                    style={estiloAba(abaAtiva === 'eixos')}
                >
                    <i className="bi bi-diagram-3-fill"></i>
                    <span>1. Avanço por Eixos ({eixos.length})</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('projetos')}
                    style={estiloAba(abaAtiva === 'projetos')}
                >
                    <i className="bi bi-star-fill" style={{ color: '#ca8a04' }}></i>
                    <span>2. Todos os Projetos ({projetos.length})</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('objetivos')}
                    style={estiloAba(abaAtiva === 'objetivos')}
                >
                    <i className="bi bi-bullseye"></i>
                    <span>3. Objetivos & Linhas (OG/LAE)</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('prazos')}
                    style={estiloAba(abaAtiva === 'prazos')}
                >
                    <i className="bi bi-hourglass-split"></i>
                    <span>4. Horizontes de Prazo</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('setores')}
                    style={estiloAba(abaAtiva === 'setores')}
                >
                    <i className="bi bi-buildings-fill"></i>
                    <span>5. Desempenho por Setores</span>
                </button>
            </div>

            {/* Conteúdo da Aba Ativa */}
            {carregando ? (
                <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#64748b' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', margin: '0 auto 1rem auto', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ fontWeight: 600, fontSize: '1rem' }}>Consolidando dados</p>
                </div>
            ) : (
                <>
                    {/* ========================================================================= */}
                    {/* VISÃO 1: AVANÇO POR EIXOS                                                 */}
                    {/* ========================================================================= */}
                    {abaAtiva === 'eixos' && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>Avanço dos 4 Eixos Centrais do PETRANS</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Percentual consolidado e totalizadores de ações por Eixo Estratégico.</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {eixos.map((eixo) => (
                                    <div key={eixo.eixoNumero} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `5px solid ${eixo.cor}` }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: eixo.cor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                    {eixo.codigo} • {eixo.sigla}
                                                </span>
                                                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                                                    {eixo.progresso}%
                                                </span>
                                            </div>

                                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#1e293b', lineHeight: 1.4 }}>
                                                {eixo.nome}
                                            </h4>

                                            {/* Barra de Progresso Horizontal */}
                                            <div style={{ height: '10px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                                                <div style={{ height: '100%', width: `${eixo.progresso}%`, background: eixo.cor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
                                            <div>
                                                <span style={{ display: 'block', fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>{eixo.acoesConcluidas}</span>
                                                <span style={{ color: '#64748b' }}>Concluídas</span>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontWeight: 700, color: '#d97706', fontSize: '1rem' }}>{eixo.acoesEmAndamento}</span>
                                                <span style={{ color: '#64748b' }}>Em Curso</span>
                                            </div>
                                            <div>
                                                <span style={{ display: 'block', fontWeight: 700, color: '#64748b', fontSize: '1rem' }}>{eixo.totalAcoes}</span>
                                                <span style={{ color: '#64748b' }}>Total</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* VISÃO 2: TODOS OS PROJETOS COM DESTAQUE NOS ESTRATÉGICOS                  */}
                    {/* ========================================================================= */}
                    {abaAtiva === 'projetos' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>Projetos do PETRANS ({projetos.length} Projetos)</h3>
                                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                        {kpis.totalEstrategicos ?? 0} Projetos Estratégicos definidos pela Administração.
                                        {podeEditarEstrategico && (
                                            <span style={{ marginLeft: '6px', color: '#2563eb', fontWeight: 600 }}>
                                                (Clique na estrela ⭐ para marcar ou desmarcar)
                                            </span>
                                        )}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => setApenasEstrategicos(false)}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: !apenasEstrategicos ? '2px solid #2563eb' : '1px solid #cbd5e1', background: !apenasEstrategicos ? '#eff6ff' : '#fff', color: !apenasEstrategicos ? '#1e40af' : '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                                    >
                                        Todos ({projetos.length})
                                    </button>
                                    <button
                                        onClick={() => setApenasEstrategicos(true)}
                                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: apenasEstrategicos ? '2px solid #ca8a04' : '1px solid #cbd5e1', background: apenasEstrategicos ? '#fefce8' : '#fff', color: apenasEstrategicos ? '#854d0e' : '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <i className="bi bi-star-fill" style={{ color: '#ca8a04' }}></i>
                                        Apenas Estratégicos ({projetos.filter(p => p.isEstrategico).length})
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                                {projetosFiltrados.map((proj) => (
                                    <div
                                        key={proj.codigo}
                                        style={{
                                            background: '#fff',
                                            border: proj.isEstrategico ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                            borderRadius: '14px',
                                            padding: '1.35rem',
                                            boxShadow: proj.isEstrategico ? '0 10px 25px rgba(59, 130, 246, 0.08)' : '0 4px 12px rgba(15, 23, 42, 0.03)',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb' }}>{proj.codigo}</span>
                                                    
                                                    {/* Badge / Botão Interativo de Estratégico (⭐) */}
                                                    {podeEditarEstrategico ? (
                                                        proj.isEstrategico ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleEstrategico(proj.codigo, true, proj.nome)}
                                                                title="Clique para remover a estrela / status de estratégico"
                                                                style={{
                                                                    background: '#fef08a',
                                                                    color: '#854d0e',
                                                                    border: '1px solid #facc15',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '999px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 800,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                ⭐ ESTRATÉGICO
                                                                <i className="bi bi-x" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}></i>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleEstrategico(proj.codigo, false, proj.nome)}
                                                                title="Clique para marcar como Projeto Estratégico (definir estrela ⭐)"
                                                                style={{
                                                                    background: '#f8fafc',
                                                                    color: '#64748b',
                                                                    border: '1px dashed #cbd5e1',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '999px',
                                                                    fontSize: '0.7rem',
                                                                    fontWeight: 600,
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                <i className="bi bi-star"></i> Marcar Estratégico
                                                            </button>
                                                        )
                                                    ) : (
                                                        proj.isEstrategico && (
                                                            <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                ⭐ PROJETO ESTRATÉGICO
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                                                    {proj.nome}
                                                </h4>
                                            </div>
                                            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: proj.progresso >= 70 ? '#16a34a' : (proj.progresso >= 40 ? '#d97706' : '#2563eb') }}>
                                                {proj.progresso}%
                                            </span>
                                        </div>

                                        {proj.tema && (
                                            <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: '#64748b' }}>
                                                {proj.tema}
                                            </p>
                                        )}

                                        {/* Barra de Progresso */}
                                        <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                            <div style={{ height: '100%', width: `${proj.progresso}%`, background: proj.isEstrategico ? '#2563eb' : '#64748b', borderRadius: '999px', transition: 'width 0.4s ease' }} />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                                            <span><strong>{proj.totalAcoes}</strong> ações vinculadas</span>
                                            <span><strong>{proj.acoesConcluidas}</strong> concluídas</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* VISÃO 3: OBJETIVOS GERAIS (OG) & LINHAS DE AÇÃO (LAE)                     */}
                    {/* ========================================================================= */}
                    {abaAtiva === 'objetivos' && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>Objetivos Gerais e Linhas de Ação</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    Acompanhamento das metas globais do PETRANS e dos projetos contribuintes para cada objetivo.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                                {(dadosObjetivos?.objetivos || []).map((og) => (
                                    <div key={og.codigo} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.35rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.82rem' }}>
                                                {og.codigo} • Eixo {og.eixoNumero}
                                            </span>
                                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>
                                                {og.progresso}%
                                            </span>
                                        </div>

                                        <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                            <div style={{ height: '100%', width: `${og.progresso}%`, background: og.eixoCor || '#2563eb', borderRadius: '999px' }} />
                                        </div>

                                        <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '0.75rem' }}>
                                            <strong>Projetos Contribuintes ({og.totalProjetos}):</strong>
                                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px', lineHeight: 1.5 }}>
                                                {og.projetosContribuintes.map((p, i) => (
                                                    <li key={i}>{p}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem', fontSize: '0.78rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Total de Ações: <strong>{og.totalAcoes}</strong></span>
                                            <span>Concluídas: <strong>{og.acoesConcluidas}</strong></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* VISÃO 4: HORIZONTES DE PRAZO                                              */}
                    {/* ========================================================================= */}
                    {abaAtiva === 'prazos' && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>Ações vs. Metas por Horizontes de Prazo</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    Filtragem e percentual acumulado por faixas temporais (Curto, Médio e Longo Prazo).
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                                {faixasPrazos.map((faixa) => (
                                    <div
                                        key={faixa.codigo}
                                        onClick={() => setPrazoSelecionado(prazoSelecionado === faixa.codigo ? '' : faixa.codigo)}
                                        style={{
                                            background: '#fff',
                                            border: prazoSelecionado === faixa.codigo ? `2px solid ${faixa.cor}` : '1px solid #e2e8f0',
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            cursor: 'pointer',
                                            boxShadow: prazoSelecionado === faixa.codigo ? '0 10px 24px rgba(0,0,0,0.08)' : '0 4px 12px rgba(15, 23, 42, 0.03)',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: faixa.cor, textTransform: 'uppercase' }}>
                                                {faixa.rotulo}
                                            </span>
                                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                                                {faixa.progressoAcumulado}%
                                            </span>
                                        </div>

                                        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.4 }}>
                                            {faixa.descricao}
                                        </p>

                                        <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                            <div style={{ height: '100%', width: `${faixa.progressoAcumulado}%`, background: faixa.cor, borderRadius: '999px' }} />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                                            <span><strong>{faixa.totalAcoes}</strong> ações previstas</span>
                                            <span style={{ color: faixa.cor, fontWeight: 700 }}>
                                                {prazoSelecionado === faixa.codigo ? '✓ Filtrando' : 'Clique para filtrar'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Detalhamento de Ações do Prazo Selecionado */}
                            {prazoSelecionado && dadosPrazosDetalhados?.acoesDetalhadas?.length > 0 && (
                                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#0f172a', fontSize: '1.1rem' }}>
                                        Ações Previstas para o {prazoSelecionado === 'CURTO' ? 'Curto Prazo' : (prazoSelecionado === 'MEDIO' ? 'Médio Prazo' : 'Longo Prazo')} ({dadosPrazosDetalhados.acoesDetalhadas.length})
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                                    <th style={{ padding: '10px' }}>ID</th>
                                                    <th style={{ padding: '10px' }}>Diretriz</th>
                                                    <th style={{ padding: '10px' }}>Projeto</th>
                                                    <th style={{ padding: '10px' }}>Setor</th>
                                                    <th style={{ padding: '10px' }}>Etapas da matriz</th>
                                                    <th style={{ padding: '10px', textAlign: 'center' }}>Progresso</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dadosPrazosDetalhados.acoesDetalhadas.map(a => (
                                                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '10px', fontWeight: 700, color: '#2563eb' }}>{a.id}</td>
                                                        <td style={{ padding: '10px', color: '#1e293b' }}>{a.diretriz}</td>
                                                        <td style={{ padding: '10px', color: '#64748b' }}>{a.projeto}</td>
                                                        <td style={{ padding: '10px', color: '#475569' }}>{a.setor}</td>
                                                        <td style={{ padding: '10px', minWidth: '190px', color: '#475569' }}>
                                                            {a.etapas?.length ? (
                                                                <details>
                                                                    <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}>
                                                                        {a.etapas.length} {a.etapas.length === 1 ? 'etapa' : 'etapas'}
                                                                    </summary>
                                                                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '18px' }}>
                                                                        {a.etapas.map(etapa => (
                                                                            <li key={etapa.id} style={{ marginBottom: '4px', color: etapa.concluida ? '#166534' : '#475569' }}>
                                                                                <i className={`bi ${etapa.concluida ? 'bi-check-circle-fill' : 'bi-circle'}`} aria-hidden="true" style={{ marginRight: '6px' }}></i>
                                                                                {etapa.titulo}
                                                                                {etapa.totalTarefas > 0 && <span style={{ color: '#94a3b8' }}> ({etapa.tarefasConcluidas}/{etapa.totalTarefas} tarefas)</span>}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </details>
                                                            ) : (
                                                                <span style={{ color: '#94a3b8' }}>Nenhuma etapa definida</span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 800, background: a.progresso === 100 ? '#dcfce7' : (a.progresso > 0 ? '#fef9c3' : '#f1f5f9'), color: a.progresso === 100 ? '#166534' : (a.progresso > 0 ? '#854d0e' : '#475569') }}>
                                                                {a.progresso}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* VISÃO 5: DESEMPENHO POR SETORES                                           */}
                    {/* ========================================================================= */}
                    {abaAtiva === 'setores' && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>Desempenho por Setores e Comissões</h3>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    Distribuição de responsabilidade e taxa de conclusão das ações do PETRANS por setor do CETRAN-PA.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {setores.map((s) => (
                                    <div
                                        key={s.setor}
                                        onClick={() => setSetorFiltro(s.setor)}
                                        style={{
                                            background: '#fff',
                                            border: setorFiltro === s.setor ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                            borderRadius: '14px',
                                            padding: '1.35rem',
                                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                                                {s.rotulo || s.setor}
                                            </h4>
                                            <span style={{ fontSize: '1.3rem', fontWeight: 800, color: s.progresso >= 70 ? '#16a34a' : (s.progresso >= 40 ? '#d97706' : '#2563eb') }}>
                                                {s.progresso}%
                                            </span>
                                        </div>

                                        <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                            <div style={{ height: '100%', width: `${s.progresso}%`, background: '#2563eb', borderRadius: '999px' }} />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                                            <span><strong>{s.totalAcoes}</strong> ações atribuídas</span>
                                            <span><strong>{s.acoesConcluidas}</strong> concluídas</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
                </>
            )}
        </div>
    );
}

const estiloKpiCard = (corBorda) => ({
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderLeft: `5px solid ${corBorda}`,
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
});

const estiloKpiLabel = {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block'
};

const estiloAba = (ativa) => ({
    background: ativa ? '#2563eb' : 'transparent',
    color: ativa ? '#fff' : '#475569',
    border: 'none',
    padding: '0.65rem 1.15rem',
    borderRadius: '8px 8px 0 0',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease'
});
