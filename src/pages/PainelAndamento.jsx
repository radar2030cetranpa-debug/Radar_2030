// src/pages/PainelAndamento.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowRight,
    ChartLineUp,
    FileCsv,
    FileXls,
    FolderOpen,
    LockKey,
    PencilSimple,
    ShieldCheck,
    TreeStructure,
    Users
} from '@phosphor-icons/react';
import { listarMatrizes } from '../services/matrizes';
import { exportarMatrizesAprovadasCSV, exportarMatrizesAprovadasExcel } from '../services/exportService';
import { ApiError } from '../services/api';
import { ehAdmin, ehComiteOuAdminGeral } from '../services/permissoes';
import logoImg from '../assets/logo-recortada.png';
import Swal from 'sweetalert2';
import { RadarLoader } from '../components/RadarLoader';

export function PainelAndamento({ usuarioLogado, onNavigate, telas = {} }) {
    const [matrizes, setMatrizes] = useState([]);
    const [carregando, setCarregando] = useState(true);

    const carregarDados = useCallback(async () => {
        setCarregando(true);
        try {
            const dados = await listarMatrizes();
            setMatrizes(Array.isArray(dados) ? dados : []);
        } catch (err) {
            const msg = err instanceof ApiError ? err.message : 'Não foi possível carregar as matrizes.';
            Swal.fire({ icon: 'error', title: 'Erro ao carregar', text: msg, confirmButtonColor: '#2563eb' });
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        if (usuarioLogado) {
            carregarDados();
        } else {
            setCarregando(false);
        }
    }, [carregarDados, usuarioLogado]);

    const totalRegistros = matrizes.length;

    const isAdmin = ehAdmin(usuarioLogado);
    const podeVerComite = ehComiteOuAdminGeral(usuarioLogado);

    const handleExportarCSV = () => {
        if (!isAdmin) return;

        const resultado = exportarMatrizesAprovadasCSV(matrizes);
        if (resultado.sucesso) {
            Swal.fire({
                icon: 'success',
                title: 'CSV gerado com sucesso!',
                text: `${resultado.quantidade} registro(s) exportado(s) para CSV pelo administrador.`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({ icon: 'info', title: 'Nada para exportar', text: resultado.mensagem, confirmButtonColor: '#2563eb' });
        }
    };

    const handleExportarExcel = () => {
        if (!isAdmin) return;

        const resultado = exportarMatrizesAprovadasExcel(matrizes);
        if (resultado.sucesso) {
            Swal.fire({
                icon: 'success',
                title: 'Excel gerado com sucesso!',
                text: `${resultado.quantidade} registro(s) exportado(s) para .xlsx pelo administrador.`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({ icon: 'info', title: 'Nada para exportar', text: resultado.mensagem, confirmButtonColor: '#2563eb' });
        }
    };

    if (!usuarioLogado) {
        return (
            <div style={{ maxWidth: '820px', margin: '3.5rem auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
                <img
                    src={logoImg}
                    alt="Logo Radar 2030"
                    style={{
                        width: 'min(100%, 380px)',
                        height: 'auto',
                        objectFit: 'contain',
                        margin: '0 auto 1.75rem auto',
                        display: 'block'
                    }}
                />
                <h1 style={{ fontSize: '2.3rem', color: '#0f172a', margin: '0 0 0.75rem 0', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    Sistema de Monitoramento do Plano Estratégico Cetran/PA 2030
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#64748b', lineHeight: 1.7, margin: '0 auto 2rem auto', maxWidth: '650px' }}>
                    Plataforma institucional do CETRAN-PA para planejamento, elaboração de matrizes 5W2H, acompanhamento de metas estratégicas e deliberação do Comitê Técnico.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', textAlign: 'left', margin: '2rem 0' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <TreeStructure size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Ações 5W2H</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Elaboração padronizada de matrizes estratégicas por setor.</p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <Users size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Comitê Gestor</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Análise colegiada, pareceres técnicos e votação de diretrizes.</p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <ChartLineUp size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Indicadores & Metas</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Monitoramento de metas e progresso em tempo real.</p>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                    <LockKey size={16} weight="bold" style={{ color: '#2563eb', marginRight: '6px' }} aria-hidden="true" />
                    Clique em <strong>Entrar</strong> no topo da página para acessar seu ambiente de trabalho.
                </div>
            </div>
        );
    }

    if (carregando) {
        return (
            <div style={{ padding: '4rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                <RadarLoader
                    tamanho="lg"
                    mensagem="Carregando indicadores do Radar 2030..."
                    submensagem="Sincronizando dados de andamento e metas estratégicas"
                />
            </div>
        );
    }

    const semDados = totalRegistros === 0;

    // Lista de serviços / módulos do Radar 2030
    const servicos = [
        {
            titulo: 'Dashboard Estratégico',
            descricao: 'Painel executivo com 5 visões em cascata: 4 Eixos, 21 Projetos (destacando 8 estratégicos), Objetivos, Horizontes de Prazo e Lente de Setores.',
            icone: ChartLineUp,
            corIcone: '#2563eb',
            bgIcone: '#eff6ff',
            tela: telas.DASHBOARD
        },
        {
            titulo: 'Ações Estratégicas',
            descricao: 'Catálogo oficial de ações do PETRANS. Consulte diretrizes, prazos, setores e inicie o preenchimento de matrizes 5W2H.',
            icone: TreeStructure,
            corIcone: '#0284c7',
            bgIcone: '#f0f9ff',
            tela: telas.ACOES
        },
        {
            titulo: 'Minhas Matrizes',
            descricao: 'Acompanhe todas as matrizes cadastradas pelo setor, monitore o status de tramitação e faça edições necessárias.',
            icone: FolderOpen,
            corIcone: '#0284c7',
            bgIcone: '#f0f9ff',
            tela: telas.CONSULTAR
        },
        {
            titulo: 'Meus Rascunhos',
            descricao: 'Retome o preenchimento de matrizes salvas localmente em rascunho para concluir e enviar para avaliação.',
            icone: PencilSimple,
            corIcone: '#ca8a04',
            bgIcone: '#fefce8',
            tela: telas.RASCUNHOS
        },
        ...(podeVerComite ? [{
            titulo: 'Painel Gestor',
            descricao: 'Ambiente de deliberação técnica para avaliação, emissão de pareceres e aprovação ou ajuste de matrizes enviadas.',
            icone: Users,
            corIcone: '#d97706',
            bgIcone: '#fffbeb',
            tela: telas.COMITE
        }] : []),
        ...(isAdmin ? [{
            titulo: 'Administração do Sistema',
            descricao: 'Controle de usuários cadastrados, gerenciamento de perfis de acesso, ativação/desativação e auditoria geral.',
            icone: LockKey,
            corIcone: '#7c3aed',
            bgIcone: '#f5f3ff',
            tela: telas.ADMIN
        }] : [])
    ];

    return (
        <div className="painel-container">
            {/* Cabeçalho do Painel */}
            <div className="painel-header">
                <div>
                    <p className="painel-eyebrow">Monitoramento Estratégico</p>
                    <h2 className="painel-title">Painel de Andamento do Radar 2030</h2>
                    <p className="painel-subtitle">
                        Visão consolidada do progresso e execução das ações do PETRANS / CETRAN-PA.
                    </p>
                </div>

                {isAdmin && (
                    <div className="painel-actions">
                        <button
                            type="button"
                            className="button button-info"
                            onClick={handleExportarCSV}
                            disabled={semDados}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                        >
                            <FileCsv size={18} weight="bold" aria-hidden="true" />
                            Exportar CSV
                        </button>

                        <button
                            type="button"
                            className="button button-success"
                            onClick={handleExportarExcel}
                            disabled={semDados}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                        >
                            <FileXls size={18} weight="bold" aria-hidden="true" />
                            Exportar Excel
                        </button>
                    </div>
                )}
            </div>

            {/* Seção de Serviços / Módulos do Sistema */}
            <div style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Módulos e Recursos</p>
                    <h3 style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', color: '#0f172a' }}>Serviços do Radar 2030</h3>
                    <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        Acesse rapidamente as ferramentas do sistema para planejar, cadastrar e acompanhar suas metas.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                    {servicos.map((servico) => (
                        <div
                            key={servico.titulo}
                            onClick={() => onNavigate?.(servico.tela)}
                            style={{
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '14px',
                                padding: '1.35rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#2563eb';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 24px rgba(37, 99, 235, 0.08)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.03)';
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.85rem' }}>
                                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: servico.bgIcone, color: servico.corIcone, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                                        {React.createElement(servico.icone, { size: 24, weight: 'regular', 'aria-hidden': true })}
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: 600 }}>{servico.titulo}</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.6 }}>
                                    {servico.descricao}
                                </p>
                            </div>

                            <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                                <span>Acessar</span>
                                <ArrowRight size={16} weight="bold" style={{ transition: 'transform 0.2s ease' }} aria-hidden="true" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rodapé Informativo */}
            <div style={{ marginTop: '2.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                <ShieldCheck size={24} weight="regular" style={{ color: '#16a34a' }} aria-hidden="true" />
                <span>Os dados exibidos neste painel são integrados em tempo real com a API do Radar 2030 conforme as diretrizes do PETRANS / CETRAN-PA.</span>
            </div>
        </div>
    );
}