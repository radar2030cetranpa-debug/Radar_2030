// src/pages/PainelAndamento.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { listarMatrizes } from '../services/matrizes';
import { acoesEstrategicas } from '../services/acoes_data';
import { exportarMatrizesAprovadasCSV, exportarMatrizesAprovadasExcel } from '../services/exportService';
import { ApiError } from '../services/api';
import { ehAdmin, ehComiteOuAdminGeral } from '../services/permissoes';
import { obterPercentuaisPorAcao } from '../services/progresso';
import logoImg from '../assets/logo.png';
import Swal from 'sweetalert2';

ChartJS.register(ArcElement, Tooltip, Legend);

const corDoProgresso = (percentual) => {
    if (percentual >= 70) return '#16a34a';
    if (percentual >= 40) return '#d97706';
    return '#dc2626';
};

// Plugin do Chart.js que desenha o percentual no centro do Gauge circular
const textoCentralPlugin = {
    id: 'textoCentralAndamento',
    afterDraw(chart) {
        const config = chart.options?.plugins?.textoCentralAndamento;
        if (!config) return;
        const { ctx, chartArea } = chart;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 1.85rem Inter, sans-serif';
        ctx.fillStyle = config.color || '#0f172a';
        ctx.fillText(`${config.label}%`, centerX, centerY - 6);

        ctx.font = '600 0.72rem Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('CONCLUÍDO', centerX, centerY + 18);
        ctx.restore();
    }
};
ChartJS.register(textoCentralPlugin);

function GaugeCircular({ percentual, altura = 180 }) {
    const cor = corDoProgresso(percentual);
    const data = {
        datasets: [{
            data: [percentual, Math.max(0, 100 - percentual)],
            backgroundColor: [cor, '#e2e8f0'],
            borderWidth: 0,
            borderRadius: 4
        }]
    };
    const options = {
        cutout: '74%',
        rotation: -90,
        circumference: 360,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
            textoCentralAndamento: { label: percentual, color: cor }
        }
    };
    return (
        <div style={{ height: altura, width: '100%', position: 'relative' }}>
            <Doughnut data={data} options={options} />
        </div>
    );
}

const STATUS_INFO = {
    RASCUNHO: { rotulo: 'Rascunhos salvos',                cor: '#fbbf24', corTexto: '#ca8a04' },
    ENVIADO:  { rotulo: 'Aguardando Análise (Enviados)',   cor: '#38bdf8', corTexto: '#0284c7' },
    APROVADO: { rotulo: 'Aprovados pelo Comitê Gestor',           cor: '#4ade80', corTexto: '#16a34a' },
    PENDENTE: { rotulo: 'Pendentes / Ajustes solicitados', cor: '#f87171', corTexto: '#dc2626' }
};

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

    const totalAcoesBase = acoesEstrategicas.length;
    const totalRegistros = matrizes.length;

    const contagem = useMemo(() => {
        const base = { RASCUNHO: 0, ENVIADO: 0, APROVADO: 0, PENDENTE: 0 };
        matrizes.forEach(m => {
            if (base[m.status] !== undefined) base[m.status] += 1;
        });
        return base;
    }, [matrizes]);

    // Cálculo do progresso global baseado nas etapas das ações estratégicas aprovadas
    const progressoGeral = useMemo(() => {
        const percentualPorAcao = obterPercentuaisPorAcao(matrizes);
        const valores = acoesEstrategicas.map(a => percentualPorAcao[a.id] ?? 0);
        if (!valores.length) return 0;
        const media = Math.round(valores.reduce((soma, v) => soma + v, 0) / valores.length);
        return media;
    }, [matrizes]);

    const dadosStatus = useMemo(() => (
        Object.entries(STATUS_INFO).map(([chave, info]) => ({
            chave,
            rotulo: info.rotulo,
            cor: info.cor,
            corTexto: info.corTexto,
            valor: contagem[chave] || 0
        }))
    ), [contagem]);

    const isAdmin = ehAdmin(usuarioLogado);
    const podeVerComite = ehComiteOuAdminGeral(usuarioLogado);

    const handleExportarCSV = () => {
        if (!isAdmin) return;

        const resultado = exportarMatrizesAprovadasCSV(matrizes);
        if (resultado.sucesso) {
            Swal.fire({
                icon: 'success',
                title: 'CSV gerado com sucesso!',
                text: `${resultado.quantidade} matriz(es) aprovada(s) exportada(s) para CSV.`,
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
                text: `${resultado.quantidade} matriz(es) aprovada(s) exportada(s) para .xlsx.`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({ icon: 'info', title: 'Nada para exportar', text: resultado.mensagem, confirmButtonColor: '#2563eb' });
        }
    };

    if (!usuarioLogado) {
        return (
            <div style={{ maxWidth: '800px', margin: '3.5rem auto', padding: '2rem 1.5rem', textAlign: 'center' }}>
                <img
                    src={logoImg}
                    alt="Logo Radar 2030"
                    style={{
                        height: '75px',
                        width: 'auto',
                        objectFit: 'contain',
                        margin: '0 auto 1.5rem auto',
                        display: 'block'
                    }}
                />
                <h1 style={{ fontSize: '2.2rem', color: '#0f172a', margin: '0 0 0.5rem 0', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Sistema de Ações Estratégicas do PETRANS
                </h1>
                <p style={{ fontSize: '1.05rem', color: '#64748b', lineHeight: 1.7, margin: '0 auto 2rem auto', maxWidth: '620px' }}>
                    Plataforma institucional do CETRAN-PA para planejamento, elaboração de matrizes 5W2H, acompanhamento de metas estratégicas e deliberação do Comitê Técnico.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', textAlign: 'left', margin: '2rem 0' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <i className="bi bi-diagram-3-fill"></i>
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Ações 5W2H</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Elaboração padronizada de matrizes estratégicas por setor.</p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <i className="bi bi-people-fill"></i>
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Comitê Gestor</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Análise colegiada, pareceres técnicos e votação de diretrizes.</p>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', marginBottom: '0.75rem' }}>
                            <i className="bi bi-graph-up-arrow"></i>
                        </div>
                        <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Indicadores & Metas</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5 }}>Monitoramento de metas e progresso em tempo real.</p>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                    <i className="bi bi-lock-fill" style={{ color: '#2563eb', marginRight: '6px' }}></i>
                    Clique em <strong>Entrar</strong> no topo da página para acessar seu ambiente de trabalho.
                </div>
            </div>
        );
    }

    if (carregando) {
        return (
            <div className="painel-estado">
                <i className="bi bi-arrow-repeat painel-estado-icon" aria-hidden="true"></i>
                <p className="painel-estado-text">Carregando indicadores do Radar 2030...</p>
            </div>
        );
    }

    const semDados = totalRegistros === 0;

    // Lista de serviços / módulos do Radar 2030
    const servicos = [
        {
            titulo: 'Dashboard Estratégico',
            descricao: 'Painel executivo com 5 visões em cascata: 4 Eixos, 21 Projetos (destacando 8 estratégicos), Objetivos, Horizontes de Prazo e Lente de Setores.',
            icone: 'bi bi-bar-chart-line-fill',
            corIcone: '#2563eb',
            bgIcone: '#eff6ff',
            tela: telas.DASHBOARD
        },
        {
            titulo: 'Ações Estratégicas',
            descricao: 'Catálogo oficial de ações do PETRANS. Consulte diretrizes, prazos, setores e inicie o preenchimento de matrizes 5W2H.',
            icone: 'bi bi-diagram-3-fill',
            corIcone: '#0284c7',
            bgIcone: '#f0f9ff',
            tela: telas.ACOES
        },
        {
            titulo: 'Minhas Matrizes',
            descricao: 'Acompanhe todas as matrizes cadastradas pelo setor, monitore o status de tramitação e faça edições necessárias.',
            icone: 'bi bi-folder2-open',
            corIcone: '#0284c7',
            bgIcone: '#f0f9ff',
            tela: telas.CONSULTAR
        },
        {
            titulo: 'Meus Rascunhos',
            descricao: 'Retome o preenchimento de matrizes salvas localmente em rascunho para concluir e enviar para avaliação.',
            icone: 'bi bi-pencil-square',
            corIcone: '#ca8a04',
            bgIcone: '#fefce8',
            tela: telas.RASCUNHOS
        },
        ...(podeVerComite ? [{
            titulo: 'Painel Gestor',
            descricao: 'Ambiente de deliberação técnica para avaliação, emissão de pareceres e aprovação ou ajuste de matrizes enviadas.',
            icone: 'bi bi-people-fill',
            corIcone: '#d97706',
            bgIcone: '#fffbeb',
            tela: telas.COMITE
        }] : []),
        ...(isAdmin ? [{
            titulo: 'Administração do Sistema',
            descricao: 'Controle de usuários cadastrados, gerenciamento de perfis de acesso, ativação/desativação e auditoria geral.',
            icone: 'bi bi-shield-lock-fill',
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
                            <i className="bi bi-filetype-csv" aria-hidden="true"></i>
                            Exportar CSV
                        </button>

                        <button
                            type="button"
                            className="button button-success"
                            onClick={handleExportarExcel}
                            disabled={semDados}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                        >
                            <i className="bi bi-file-earmark-excel" aria-hidden="true"></i>
                            Exportar Excel
                        </button>
                    </div>
                )}
            </div>

            {/* Grid Superior: Gráfico Circular + Métricas Rápidas + Status */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                
                {/* Card do Gráfico Circular */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Meta Global PETRANS</p>
                        <h3 style={{ margin: '0.3rem 0 0.8rem 0', fontSize: '1.1rem', color: '#0f172a' }}>Progresso Geral do Plano</h3>
                    </div>
                    
                    <div style={{ padding: '0.5rem 0' }}>
                        <GaugeCircular percentual={progressoGeral} />
                    </div>

                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#64748b', textAlign: 'center', lineHeight: 1.5 }}>
                        Calculado automaticamente a partir das etapas concluídas nas matrizes aprovadas.
                    </p>
                </div>

                {/* Cards de Métricas Rápidas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'space-between' }}>
                    <div className="painel-metric" style={{ borderLeftColor: '#2563eb' }}>
                        <i className="bi bi-diagram-3 painel-metric-icon" aria-hidden="true"></i>
                        <span className="painel-metric-label">Ações Estratégicas Base</span>
                        <span className="painel-metric-value">{totalAcoesBase}</span>
                    </div>

                    <div className="painel-metric is-azul-escuro">
                        <i className="bi bi-clipboard-data painel-metric-icon" aria-hidden="true"></i>
                        <span className="painel-metric-label">Matrizes Cadastradas</span>
                        <span className="painel-metric-value">{totalRegistros}</span>
                    </div>

                    <div className="painel-metric is-verde">
                        <i className="bi bi-check2-circle painel-metric-icon" aria-hidden="true"></i>
                        <span className="painel-metric-label">Aprovadas pelo Comitê Gestor</span>
                        <span className="painel-metric-value">{contagem.APROVADO}</span>
                    </div>
                </div>

                {/* Card de Distribuição por Status */}
                <div className="painel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 className="painel-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <i className="bi bi-pie-chart" style={{ color: '#2563eb' }}></i>
                            Status das Matrizes
                        </h3>
                        <ul className="painel-status-list">
                            {dadosStatus.map(item => (
                                <li key={item.chave} className="painel-status-item">
                                    <span className="painel-status-label">
                                        <span className="painel-status-dot" style={{ background: item.cor }} />
                                        {item.rotulo}
                                    </span>
                                    <span className="painel-status-value" style={{ color: item.corTexto }}>
                                        {item.valor}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem' }}>
                        <i className="bi bi-info-circle" style={{ marginRight: '4px' }}></i>
                        {contagem.ENVIADO} matriz(es) aguardando parecer do Comitê Gestor.
                    </p>
                </div>
            </div>

            {/* Seção de Serviços / Módulos do Sistema */}
            <div style={{ marginTop: '2.5rem' }}>
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
                                        <i className={servico.icone}></i>
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b', fontWeight: 600 }}>{servico.titulo}</h4>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b', lineHeight: 1.6 }}>
                                    {servico.descricao}
                                </p>
                            </div>

                            <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#2563eb', fontWeight: 600, fontSize: '0.85rem' }}>
                                <span>Acessar</span>
                                <i className="bi bi-arrow-right" style={{ transition: 'transform 0.2s ease' }}></i>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rodapé Informativo */}
            <div style={{ marginTop: '2.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                <i className="bi bi-shield-check" style={{ fontSize: '1.2rem', color: '#16a34a' }}></i>
                <span>Os dados exibidos neste painel são integrados em tempo real com a API do Radar 2030 conforme as diretrizes do PETRANS / CETRAN-PA.</span>
            </div>
        </div>
    );
}