// src/pages/ConsultarMatrizes.jsx
import { contarTarefas, calcularPercentualEtapas, calcularPercentualEtapa } from '../services/progresso';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, PencilSimple, Trash } from '@phosphor-icons/react';
import { listarMatrizes, removerMatriz } from '../services/matrizes';
import Swal from 'sweetalert2';
import { RadarLoader } from '../components/RadarLoader';
import '../styles/consultarMatrizes.css';

export function ConsultarMatrizes({ usuarioLogado, modo = 'todas', onNavigate, onEditar }) {
    const [registros, setRegistros] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [termoBusca, setTermoBusca] = useState('');
    const [matrizSelecionada, setMatrizSelecionada] = useState(null);
    const modalRef = useRef(null);
    const elementoAntesDoModalRef = useRef(null);

    const carregarDados = useCallback(async () => {
        setCarregando(true);
        try {
            const params = {};
            if (modo === 'rascunhos') {
                params.status = 'RASCUNHO';
                if (usuarioLogado?.id) {
                    params.usuarioId = usuarioLogado.id;
                }
            } else if (filtroStatus !== 'TODOS') {
                params.status = filtroStatus;
            }

            const data = await listarMatrizes(params);
            setRegistros(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Erro ao listar matrizes:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao carregar',
                text: error.message || 'Não foi possível carregar as matrizes do servidor.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setCarregando(false);
        }
    }, [modo, filtroStatus, usuarioLogado]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    useEffect(() => {
        if (!matrizSelecionada) return undefined;

        elementoAntesDoModalRef.current = document.activeElement;
        const modal = modalRef.current;
        const primeiroBotao = modal?.querySelector('button');
        primeiroBotao?.focus();

        const handleModalKeyDown = (event) => {
            if (event.key === 'Escape') {
                setMatrizSelecionada(null);
                return;
            }

            if (event.key !== 'Tab' || !modal) return;

            const elementosFocaveis = [...modal.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )];
            const primeiro = elementosFocaveis[0];
            const ultimo = elementosFocaveis[elementosFocaveis.length - 1];

            if (event.shiftKey && document.activeElement === primeiro) {
                event.preventDefault();
                ultimo?.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primeiro?.focus();
            }
        };

        document.addEventListener('keydown', handleModalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleModalKeyDown);
            if (elementoAntesDoModalRef.current instanceof HTMLElement) {
                elementoAntesDoModalRef.current.focus();
            }
        };
    }, [matrizSelecionada]);

    const registrosFiltrados = registros.filter(reg => {
        const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '');
        const buscaLower = termoBusca.toLowerCase();

        const matchTermo = (
            String(reg.id || '') +
            ' ' + (reg.nome || '') +
            ' ' + autorEmail +
            ' ' + (reg.oque || '')
        ).toLowerCase().includes(buscaLower);

        return matchTermo;
    });
    const existemFiltrosAtivos = Boolean(termoBusca.trim()) || (modo !== 'rascunhos' && filtroStatus !== 'TODOS');
    const mostrarBusca = modo !== 'rascunhos' || registros.length > 0;
    const mostrarContagem = modo !== 'rascunhos' || registros.length > 0;

    const limparFiltros = () => {
        setTermoBusca('');
        setFiltroStatus('TODOS');
    };

    const handleExcluir = async (id) => {
        const result = await Swal.fire({
            title: 'Excluir registro?',
            text: 'Esta ação não poderá ser desfeita no banco de dados.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#e63946',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await removerMatriz(id);
                setRegistros(prev => prev.filter(r => r.id !== id));

                Swal.fire({
                    icon: 'success',
                    title: 'Excluído!',
                    text: 'O registro foi removido com sucesso.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Erro ao excluir matriz:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao excluir',
                    text: error.message || 'Não foi possível excluir a matriz.',
                    confirmButtonColor: '#2563eb'
                });
            }
        }
    };

    const podeEditar = (reg) => {
        if (reg.status === 'APROVADO') {
            return usuarioLogado?.role === 'ADMIN_GERAL';
        }
        const autorId = reg.criadoPor?.id || reg.usuarioId;
        const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '');
        const ehAutor = (usuarioLogado?.id && autorId === usuarioLogado.id) ||
                        (usuarioLogado?.email && autorEmail === usuarioLogado.email);
        const ehAdmin = usuarioLogado?.role === 'ADMIN_GERAL' || usuarioLogado?.role === 'ADMIN_SETOR';

        return ehAutor || ehAdmin;
    };

    const podeExcluir = (reg) => {
        if (reg.status === 'APROVADO') {
            return usuarioLogado?.role === 'ADMIN_GERAL';
        }
        const autorId = reg.criadoPor?.id || reg.usuarioId;
        const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '');
        const ehAutor = (usuarioLogado?.id && autorId === usuarioLogado.id) ||
                        (usuarioLogado?.email && autorEmail === usuarioLogado.email);
        const ehAdmin = usuarioLogado?.role === 'ADMIN_GERAL';

        return ehAutor || ehAdmin;
    };

    return (
        <div className={`consultar-matrizes-page${modo === 'rascunhos' && !carregando && registros.length === 0 ? ' is-empty-drafts' : ''}`}>
            <header className="consultar-matrizes-header">
                <div>
                    <h1 className="consultar-matrizes-title">{modo === 'rascunhos' ? 'Meus Rascunhos' : 'Minhas Matrizes'}</h1>
                    <p className="consultar-matrizes-subtitle">
                        {modo === 'rascunhos'
                            ? 'Acompanhe e retome matrizes que ainda não foram enviadas para o comitê.'
                            : 'Consulte todas as matrizes sincronizadas com o servidor, filtrando por status ou termo.'}
                    </p>
                </div>

                {mostrarBusca && (
                    <div className="consultar-matrizes-filters">
                        <div className="consultar-matrizes-filter">
                            <label htmlFor="buscar-matriz">Buscar matrizes</label>
                            <input
                                id="buscar-matriz"
                                type="search"
                                placeholder="ID, nome ou autor"
                                value={termoBusca}
                                onChange={(e) => setTermoBusca(e.target.value)}
                                className="consultar-matrizes-control"
                            />
                        </div>
                        {modo !== 'rascunhos' && (
                            <div className="consultar-matrizes-filter">
                                <label htmlFor="filtro-status-matriz">Filtrar por status</label>
                                <select
                                    id="filtro-status-matriz"
                                    value={filtroStatus}
                                    onChange={(e) => setFiltroStatus(e.target.value)}
                                    className="consultar-matrizes-control"
                                >
                                    <option value="TODOS">Todos os status</option>
                                    <option value="RASCUNHO">Rascunho</option>
                                    <option value="ENVIADO">Enviado</option>
                                    <option value="APROVADO">Aprovado</option>
                                    <option value="PENDENTE">Pendente / Correção</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </header>

            <section className="consultar-matrizes-card" aria-label="Lista de matrizes">
                {!carregando && mostrarContagem && (
                    <div className="consultar-matrizes-results" role="status" aria-live="polite">
                        {registrosFiltrados.length} {registrosFiltrados.length === 1 ? 'matriz encontrada' : 'matrizes encontradas'}
                    </div>
                )}
                {carregando ? (
                    <div style={{ padding: '3.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <RadarLoader
                            tamanho="md"
                            mensagem="Carregando matrizes do servidor..."
                            submensagem="Consultando registros e histórico de tramitação"
                        />
                    </div>
                ) : registrosFiltrados.length > 0 ? (
                    <div className="consultar-matrizes-table-wrap" role="region" aria-label="Tabela de matrizes" tabIndex={0}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '12px' }}>ID</th>
                                    <th style={{ padding: '12px' }}>Nome da Ação</th>
                                    <th style={{ padding: '12px' }}>Autor</th>
                                    <th style={{ padding: '12px' }}>Custo (Quanto)</th>
                                    <th style={{ padding: '12px' }}>Progresso</th>
                                    <th style={{ padding: '12px' }}>Status</th>
                                    <th style={{ padding: '12px', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrosFiltrados.map(reg => {
                                    const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '-');
                                    return (
                                        <tr key={reg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#2563eb' }}>{reg.id}</td>
                                            <td style={{ padding: '12px', color: '#1e293b' }}>{reg.nome}</td>
                                            <td style={{ padding: '12px', color: '#64748b' }}>{autorEmail}</td>
                                            <td style={{ padding: '12px', fontWeight: '500' }}>{reg.quanto || '-'}</td>
                                            <td style={{ padding: '12px' }}>{reg.percentual || 0}%</td>
                                            <td style={{ padding: '12px' }}><span style={estiloBadgeStatus(reg.status)}>{reg.status}</span></td>
                                            <td className="consultar-matrizes-actions-cell">
                                                <div className="consultar-matrizes-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => setMatrizSelecionada(reg)}
                                                        title="Ver matriz"
                                                        className="consultar-matrizes-action consultar-matrizes-action-view"
                                                    >
                                                        <Eye size={18} weight="bold" aria-hidden="true" />
                                                        <span>Ver</span>
                                                    </button>
                                                    {podeEditar(reg) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onEditar && onEditar(reg)}
                                                            title={reg.status === 'APROVADO' ? 'Editar matriz aprovada' : 'Editar matriz'}
                                                            className="consultar-matrizes-action consultar-matrizes-action-edit"
                                                        >
                                                            <PencilSimple size={18} weight="bold" aria-hidden="true" />
                                                            <span>Editar</span>
                                                        </button>
                                                    )}
                                                    {podeExcluir(reg) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExcluir(reg.id)}
                                                            title="Excluir matriz"
                                                            className="consultar-matrizes-action consultar-matrizes-action-delete"
                                                        >
                                                            <Trash size={18} weight="bold" aria-hidden="true" />
                                                            <span>Excluir</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="consultar-matrizes-empty">
                        <h2>
                            {existemFiltrosAtivos
                                ? 'Nenhuma matriz corresponde aos filtros.'
                                : modo === 'rascunhos' ? 'Você ainda não tem rascunhos salvos.' : 'Você ainda não tem matrizes.'}
                        </h2>
                        <p>
                            {existemFiltrosAtivos
                                ? 'Tente outro termo de busca ou selecione um status diferente.'
                                : modo === 'rascunhos'
                                    ? 'Quando salvar uma matriz como rascunho, ela aparecerá aqui para você continuar.'
                                    : 'Comece escolhendo uma ação estratégica para criar sua primeira matriz.'}
                        </p>
                        {existemFiltrosAtivos ? (
                            <button type="button" className="consultar-matrizes-primary-button" onClick={limparFiltros}>
                                Limpar filtros
                            </button>
                        ) : (
                            <button type="button" className="consultar-matrizes-primary-button" onClick={() => onNavigate('acoes')}>
                                Criar nova matriz
                            </button>
                        )}
                    </div>
                )}
            </section>

            {/* Modal de Detalhes da Matriz */}
            {matrizSelecionada && (
                <div className="consultar-matrizes-modal-backdrop">
                    <div
                        ref={modalRef}
                        className="consultar-matrizes-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="detalhes-matriz-titulo"
                        tabIndex={-1}
                    >
                        <button
                            type="button"
                            className="consultar-matrizes-modal-close"
                            onClick={() => setMatrizSelecionada(null)}
                            aria-label="Fechar detalhes da matriz"
                        >
                            &times;
                        </button>
                        
                        <h2 id="detalhes-matriz-titulo" className="consultar-matrizes-modal-title">Detalhes da Matriz: {matrizSelecionada.id}</h2>
                        
                        <p><strong>Nome:</strong> {matrizSelecionada.nome}</p>
                        <p><strong>Autor:</strong> {matrizSelecionada.criadoPor?.email || (typeof matrizSelecionada.criadoPor === 'string' ? matrizSelecionada.criadoPor : '-')}</p>
                        <p><strong>Progresso:</strong> {matrizSelecionada.percentual || 0}%</p>
                        <p><strong>Status atual:</strong> <span style={estiloBadgeStatus(matrizSelecionada.status)}>{matrizSelecionada.status}</span></p>
                        <p><strong>Parecer do Comitê Gestor:</strong> {matrizSelecionada.comentarioComite || '-'}</p>

                        {/* Ações Vinculadas */}
                        {Array.isArray(matrizSelecionada.acoes) && matrizSelecionada.acoes.length > 0 && (
                            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.8rem 0', color: '#1e293b', fontSize: '0.95rem' }}>Ações Estratégicas Vinculadas</h4>
                                {matrizSelecionada.acoes.map((item, idx) => (
                                    <div key={item.acaoId || idx} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#2563eb' }}>{item.acaoId} - {item.acao?.diretriz || ''}</p>
                                        <p style={{ margin: '0 0 4px 0', color: '#64748b' }}>Setor: {item.acao?.setor || '-'} | Prazo: {item.acao?.prazo || '-'}</p>
                                        {Array.isArray(item.etapas) && item.etapas.length > 0 && (
                                            <div style={{ color: '#334155' }}>
                                                <p style={{ margin: '0 0 4px 0' }}>
                                                    {item.etapas.length} {item.etapas.length === 1 ? 'etapa' : 'etapas'}, {contarTarefas(item.etapas).concluidas} de {contarTarefas(item.etapas).total} tarefas concluídas ({calcularPercentualEtapas(item.etapas)}%)
                                                </p>
                                                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                                    {item.etapas.map((etapa, i) => (
                                                        <li key={etapa.id || i}>{etapa.titulo || `Etapa ${i + 1}`}: {calcularPercentualEtapa(etapa)}%{Array.isArray(etapa.tarefas) && etapa.tarefas.length > 0 ? ` (${etapa.tarefas.length} ${etapa.tarefas.length === 1 ? 'tarefa' : 'tarefas'})` : ''}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button type="button" className="consultar-matrizes-primary-button consultar-matrizes-modal-dismiss" onClick={() => setMatrizSelecionada(null)}>
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function estiloBadgeStatus(status) {
    const s = String(status || '').toUpperCase();
    let bg = '#e2e8f0';
    let color = '#475569';
    if (s === 'APROVADO') { bg = '#dcfce7'; color = '#166534'; }
    else if (s === 'ENVIADO') { bg = '#e0f2fe'; color = '#075985'; }
    else if (s === 'PENDENTE') { bg = '#fee2e2'; color = '#991b1b'; }
    else if (s === 'RASCUNHO') { bg = '#fef9c3'; color = '#713f12'; }

    return {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        backgroundColor: bg,
        color: color
    };
}