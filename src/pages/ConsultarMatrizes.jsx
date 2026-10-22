// src/pages/ConsultarMatrizes.jsx
import { contarTarefas, calcularPercentualEtapas, calcularPercentualEtapa } from '../services/progresso';
import React, { useState, useEffect, useCallback } from 'react';
import { listarMatrizes, removerMatriz } from '../services/matrizes';
import Swal from 'sweetalert2';
import { RadarLoader } from '../components/RadarLoader';

export function ConsultarMatrizes({ usuarioLogado, modo = 'todas', onNavigate, onEditar }) {
    const [registros, setRegistros] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [termoBusca, setTermoBusca] = useState('');
    const [matrizSelecionada, setMatrizSelecionada] = useState(null);

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
        const autorId = reg.criadoPor?.id || reg.usuarioId;
        const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '');
        const ehAutor = (usuarioLogado?.id && autorId === usuarioLogado.id) ||
                        (usuarioLogado?.email && autorEmail === usuarioLogado.email);
        const ehAdmin = usuarioLogado?.role === 'ADMIN_GERAL' || usuarioLogado?.role === 'ADMIN_SETOR';

        // Rascunhos e Pendentes podem ser editados; Aprovadas podem ter progresso atualizado
        return ehAutor || ehAdmin;
    };

    const podeExcluir = (reg) => {
        const autorId = reg.criadoPor?.id || reg.usuarioId;
        const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '');
        const ehAutor = (usuarioLogado?.id && autorId === usuarioLogado.id) ||
                        (usuarioLogado?.email && autorEmail === usuarioLogado.email);
        const ehAdmin = usuarioLogado?.role === 'ADMIN_GERAL';

        // Não permite excluir matrizes já aprovadas
        return (ehAutor || ehAdmin) && reg.status !== 'APROVADO';
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h2 style={{ color: '#1e293b', margin: 0 }}>{modo === 'rascunhos' ? 'Meus Rascunhos' : 'Minhas Matrizes'}</h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '0.4rem' }}>
                        {modo === 'rascunhos'
                            ? 'Continue trabalhando nas matrizes que ainda não foram enviadas para o comitê.'
                            : 'Consulte todas as matrizes sincronizadas com o servidor, filtrando por status ou termo.'}
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        placeholder="Buscar por ID, nome ou autor..." 
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        style={{ padding: '0.5rem 1rem', minWidth: '200px', width: '100%', maxWidth: '300px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
                    />
                    {modo !== 'rascunhos' && (
                        <select 
                            value={filtroStatus} 
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', fontSize: '0.9rem' }}
                        >
                            <option value="TODOS">Todos os Status</option>
                            <option value="RASCUNHO">Rascunho</option>
                            <option value="ENVIADO">Enviado</option>
                            <option value="APROVADO">Aprovado</option>
                            <option value="PENDENTE">Pendente / Correção</option>
                        </select>
                    )}
                </div>
            </div>

            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {carregando ? (
                    <div style={{ padding: '3.5rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <RadarLoader
                            tamanho="md"
                            mensagem="Carregando matrizes do servidor..."
                            submensagem="Consultando registros e histórico de tramitação"
                        />
                    </div>
                ) : registrosFiltrados.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
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
                                            <td style={{ padding: '12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                <button
                                                    onClick={() => setMatrizSelecionada(reg)}
                                                    title="Ver matriz"
                                                    aria-label="Ver matriz"
                                                    style={{ background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', marginRight: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}
                                                >
                                                    <i className="bi bi-eye-fill" aria-hidden="true" />
                                                </button>
                                                {podeEditar(reg) && (
                                                    <button
                                                        onClick={() => onEditar && onEditar(reg)}
                                                        title={reg.status === 'APROVADO' ? 'Andamento da matriz' : 'Editar matriz'}
                                                        aria-label={reg.status === 'APROVADO' ? 'Andamento da matriz' : 'Editar matriz'}
                                                        style={{ background: 'transparent', border: 'none', color: '#558BC9', cursor: 'pointer', marginRight: '8px', fontWeight: 'bold', fontSize: '1.1rem' }}
                                                    >
                                                        <i className={reg.status === 'APROVADO' ? 'bi bi-file-text' : 'bi bi-pencil-square'} aria-hidden="true" />
                                                    </button>
                                                )}
                                                {podeExcluir(reg) && (
                                                    <button
                                                        onClick={() => handleExcluir(reg.id)}
                                                        title="Excluir matriz"
                                                        aria-label="Excluir matriz"
                                                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
                                                    >
                                                        <i className="bi bi-trash3-fill" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>
                            {modo === 'rascunhos' ? 'Você não possui nenhum rascunho salvo.' : 'Nenhuma matriz encontrada.'}
                        </h3>
                        <p style={{ marginBottom: '1.5rem' }}>
                            {modo === 'rascunhos'
                                ? 'Salve um rascunho no formulário para continuar a trabalhar nele depois.'
                                : 'Crie uma nova matriz a partir das ações estratégicas para começar.'}
                        </p>
                        <button onClick={() => onNavigate('acoes')} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Criar nova matriz
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Detalhes da Matriz */}
            {matrizSelecionada && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                        <span onClick={() => setMatrizSelecionada(null)} style={{ position: 'absolute', top: '15px', right: '20px', cursor: 'pointer', fontSize: '1.5rem', color: '#64748b' }}>&times;</span>
                        
                        <h3 style={{ marginTop: 0, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>Detalhes da Matriz: {matrizSelecionada.id}</h3>
                        
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

                        <button onClick={() => setMatrizSelecionada(null)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', marginTop: '1rem', width: '100%', fontWeight: 'bold' }}>
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
    if (s === 'APROVADO') { bg = '#dcfce7'; color = '#16a34a'; }
    else if (s === 'ENVIADO') { bg = '#e0f2fe'; color = '#0284c7'; }
    else if (s === 'PENDENTE') { bg = '#fee2e2'; color = '#dc2626'; }
    else if (s === 'RASCUNHO') { bg = '#fef9c3'; color = '#ca8a04'; }

    return {
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        backgroundColor: bg,
        color: color
    };
}