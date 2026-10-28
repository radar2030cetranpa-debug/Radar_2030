// src/pages/PainelAndamento.jsx
import React from 'react';
import {
    ArrowRight,
    ChartLineUp,
    FolderOpen,
    LockKey,
    PencilSimple,
    TreeStructure,
    Users
} from '@phosphor-icons/react';
import { ehAdmin, ehComiteOuAdminGeral } from '../services/permissoes';
import logoImg from '../assets/logo-recortada.png';

export function PainelAndamento({ usuarioLogado, onNavigate, loginTriggerRef, telas = {} }) {
    const isAdmin = ehAdmin(usuarioLogado);
    const podeVerComite = ehComiteOuAdminGeral(usuarioLogado);

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

                <button
                    type="button"
                    onClick={() => loginTriggerRef?.current?.()}
                    className="landing-cta"
                >
                    Acessar o sistema
                </button>
                <p style={{ margin: '0.75rem 0 2rem', color: '#475569', fontSize: '0.95rem' }}>
                    Entre para acessar seu ambiente de trabalho.
                </p>

                <section aria-label="Recursos disponíveis na plataforma" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', textAlign: 'left', margin: '2rem 0' }}>
                    <article className="landing-feature-card">
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <TreeStructure size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <h2 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Ações 5W2H</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Elaboração padronizada de matrizes estratégicas por setor.</p>
                    </article>

                    <article className="landing-feature-card">
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <Users size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <h2 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Comitê Gestor</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Análise colegiada, pareceres técnicos e votação de diretrizes.</p>
                    </article>

                    <article className="landing-feature-card">
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <ChartLineUp size={24} weight="regular" aria-hidden="true" />
                        </div>
                        <h2 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Indicadores & Metas</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Monitoramento de metas e progresso em tempo real.</p>
                    </article>
                </section>
            </div>
        );
    }

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

            </div>

            {/* Seção de Serviços / Módulos do Sistema */}
            <section className="painel-servicos" aria-labelledby="painel-servicos-titulo">
                <div style={{ marginBottom: '1.25rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Módulos e Recursos</p>
                    <h3 id="painel-servicos-titulo" style={{ margin: '0.25rem 0 0 0', fontSize: '1.35rem', color: '#0f172a' }}>Serviços do Radar 2030</h3>
                    <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        Acesse rapidamente as ferramentas do sistema para planejar, cadastrar e acompanhar suas metas.
                    </p>
                </div>

                <div className="painel-servicos-grid">
                    {servicos.map((servico) => (
                        <article
                            key={servico.titulo}
                            className="painel-servico-card"
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

                            <button
                                type="button"
                                className="painel-servico-acessar"
                                onClick={() => onNavigate?.(servico.tela)}
                                aria-label={`Acessar ${servico.titulo}`}
                            >
                                <span>Acessar</span>
                                <ArrowRight size={16} weight="bold" aria-hidden="true" />
                            </button>
                        </article>
                    ))}
                </div>
            </section>

        </div>
    );
}