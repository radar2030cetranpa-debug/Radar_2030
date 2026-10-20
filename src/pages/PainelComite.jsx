// src/pages/PainelComite.jsx
import { contarTarefas } from '../services/progresso';
import React, { useState, useEffect, useCallback } from 'react';
import { listarPendentes, votarComite, avaliarComite, estatisticasComite, buscarHistoricoComite } from '../services/comite';
import Swal from 'sweetalert2';

export function PainelComite({ usuarioLogado }) {
    const [pendentesComite, setPendentesComite] = useState([]);
    const [estatisticas, setEstatisticas] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [matrizEmAvaliacao, setMatrizEmAvaliacao] = useState(null);
    const [historicoMatriz, setHistoricoMatriz] = useState(null);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);

    const ehAdminGeral = usuarioLogado?.role === 'ADMIN_GERAL';

    // Para Admin Geral: 'APROVADO' ou 'PENDENTE'
    // Para Conselheiro (COMITE): 'APROVAR' ou 'REJEITAR'
    const [decisao, setDecisao] = useState(ehAdminGeral ? 'APROVADO' : 'APROVAR');
    const [comentario, setComentario] = useState('');

    const carregarDados = useCallback(async () => {
        setCarregando(true);
        try {
            const [pendentes, stats] = await Promise.all([
                listarPendentes(),
                estatisticasComite().catch(() => null)
            ]);
            setPendentesComite(Array.isArray(pendentes) ? pendentes : []);
            if (stats) setEstatisticas(stats);
        } catch (error) {
            console.error('Erro ao carregar dados do comitê:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao carregar',
                text: error.message || 'Não foi possível carregar as matrizes pendentes do comitê.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    const abrirModalAvaliacao = async (matriz) => {
        setMatrizEmAvaliacao(matriz);
        setHistoricoMatriz(null);
        setCarregandoHistorico(true);
        try {
            setHistoricoMatriz(await buscarHistoricoComite(matriz.id));
        } catch (error) {
            console.error('Erro ao carregar histórico da matriz:', error);
        } finally {
            setCarregandoHistorico(false);
        }
        if (ehAdminGeral) {
            setDecisao('APROVADO');
        } else {
            // Se o conselheiro já votou, carrega o voto dele
            const meuVoto = (matriz.votos || []).find(v => v.usuario?.id === usuarioLogado?.id || v.usuarioId === usuarioLogado?.id);
            if (meuVoto) {
                setDecisao(meuVoto.voto);
                setComentario(meuVoto.comentario || '');
                return;
            }
            setDecisao('APROVAR');
        }
        setComentario('');
    };

    const handleSalvarParecer = async (e) => {
        e.preventDefault();
        if (!matrizEmAvaliacao) return;

        if (!comentario.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Comentário obrigatório',
                text: 'Por favor, registre a justificativa ou parecer técnico.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        setEnviando(true);
        try {
            if (ehAdminGeral) {
                // Decisão final: PUT /comite/matrizes/:id/avaliar
                await avaliarComite(matrizEmAvaliacao.id, decisao, comentario.trim());
                Swal.fire({
                    icon: 'success',
                    title: 'Parecer emitido com sucesso!',
                    text: `A matriz ${matrizEmAvaliacao.id} foi atualizada para o status: ${decisao}.`,
                    timer: 2200,
                    showConfirmButton: false
                });
            } else {
                // Voto consultivo do Conselheiro: POST /comite/matrizes/:id/votar
                await votarComite(matrizEmAvaliacao.id, decisao, comentario.trim());
                Swal.fire({
                    icon: 'success',
                    title: 'Voto registrado!',
                    text: `Seu voto "${decisao}" na matriz ${matrizEmAvaliacao.id} foi registrado com sucesso.`,
                    timer: 2200,
                    showConfirmButton: false
                });
            }

            setMatrizEmAvaliacao(null);
            setComentario('');
            await carregarDados();
        } catch (error) {
            console.error('Erro ao emitir parecer/voto:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao salvar',
                text: error.message || 'Não foi possível registrar o parecer/voto.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            {ehAdminGeral ? 'Gestão de Avaliações (Admin Geral)' : 'Painel Gestor'}
                        </p>
                        <h1 style={{ fontSize: '2.2rem', color: '#0f172a', margin: '0.5rem 0 0 0', lineHeight: 1.1 }}>
                            {ehAdminGeral ? 'Painel de Homologação do Comitê Gestor' : 'Painel Gestor'}
                        </h1>
                    </div>
                    <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '760px', lineHeight: 1.75, margin: 0 }}>
                        {ehAdminGeral
                            ? 'Como Administrador Geral, homologue as matrizes aprovando ou solicitando ajustes com base nos votos e deliberações do Comitê.'
                            : 'Avalie as matrizes estratégicas enviadas para análise do Comitê Gestor emitindo seu voto consultivo fundamentado.'}
                    </p>
                </div>
            </div>

            {/* Estatísticas Rápidas */}
            {estatisticas && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', borderLeft: '4px solid #0284c7' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Aguardando Avaliação</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', color: '#0f172a' }}>{estatisticas.enviados ?? pendentesComite.length}</h3>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', borderLeft: '4px solid #16a34a' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Homologadas / Aprovadas</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', color: '#0f172a' }}>{estatisticas.aprovados ?? 0}</h3>
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', borderLeft: '4px solid #dc2626' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Com Correção Solicitada</span>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', color: '#0f172a' }}>{estatisticas.pendentes ?? 0}</h3>
                    </div>
                </div>
            )}

            <div style={{ background: '#fff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 18px 55px rgba(15, 23, 42, 0.08)' }}>
                {carregando ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <p style={{ margin: 0, fontSize: '1rem' }}>Carregando matrizes pendentes do servidor...</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>ID</th>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>Nome da Ação</th>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>Autor</th>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>Setor</th>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>Etapas / Tarefas</th>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>Votos</th>
                                    <th style={{ padding: '16px', fontWeight: 700 }}>Status</th>
                                    <th style={{ padding: '16px', fontWeight: 700, textAlign: 'center' }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendentesComite.length > 0 ? (
                                    pendentesComite.map(reg => {
                                        const autorEmail = reg.criadoPor?.email || (typeof reg.criadoPor === 'string' ? reg.criadoPor : '-');
                                        const autorSetor = reg.criadoPor?.setor || reg.setor || '-';
                                        const totalVotos = Array.isArray(reg.votos) ? reg.votos.length : 0;
                                        const votosAprovar = Array.isArray(reg.votos) ? reg.votos.filter(v => v.voto === 'APROVAR').length : 0;
                                        const meuVoto = (reg.votos || []).find(v => v.usuario?.id === usuarioLogado?.id || v.usuarioId === usuarioLogado?.id);

                                        return (
                                            <tr key={reg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '16px', fontWeight: '700', color: '#2563eb', verticalAlign: 'top' }}>{reg.id}</td>
                                                <td style={{ padding: '16px', color: '#0f172a', verticalAlign: 'top', maxWidth: '220px', whiteSpace: 'normal' }}>{reg.nome}</td>
                                                <td style={{ padding: '16px', color: '#475569', verticalAlign: 'top' }}>{autorEmail}</td>
                                                <td style={{ padding: '16px', color: '#475569', verticalAlign: 'top' }}>{autorSetor}</td>
                                                <td style={{ padding: '16px', color: '#0f172a', fontWeight: '600', verticalAlign: 'top' }}>{(() => { const et = (reg.acoes || []).flatMap(a => a.etapas || []); return `${et.length} / ${contarTarefas(et).total}`; })()}</td>
                                                <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                                    <span style={{ fontSize: '0.85rem', color: totalVotos > 0 ? '#166534' : '#64748b' }}>
                                                        {totalVotos > 0 ? `${votosAprovar}/${totalVotos} a favor` : 'Nenhum'}
                                                    </span>
                                                    {meuVoto && (
                                                        <span style={{ display: 'block', fontSize: '0.72rem', color: meuVoto.voto === 'APROVAR' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                                                            (Votou: {meuVoto.voto})
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', verticalAlign: 'top' }}><span style={estiloBadgeStatus(reg.status)}>{reg.status}</span></td>
                                                <td style={{ padding: '16px', textAlign: 'center', verticalAlign: 'top' }}>
                                                    <button 
                                                        onClick={() => abrirModalAvaliacao(reg)} 
                                                        style={{ 
                                                            background: ehAdminGeral ? '#1e40af' : '#2563eb', 
                                                            color: '#fff', 
                                                            border: 'none', 
                                                            padding: '0.75rem 1.2rem', 
                                                            borderRadius: '999px', 
                                                            cursor: 'pointer', 
                                                            fontWeight: '700', 
                                                            transition: 'transform 0.2s ease', 
                                                            minWidth: '140px' 
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                                    >
                                                        {ehAdminGeral ? 'Homologar Decisão' : (meuVoto ? 'Revisar Voto' : 'Votar')}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                                            <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', maxWidth: '560px' }}>
                                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.35rem' }}>Nenhuma matriz aguardando avaliação.</h3>
                                                <p style={{ margin: 0, lineHeight: 1.75 }}>As matrizes enviadas pelos usuários aparecerão aqui para análise do Comitê.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal de Avaliação do Comitê */}
            {matrizEmAvaliacao && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15, 23, 42, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '18px', width: '100%', maxWidth: '1000px', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' }}>
                        <button onClick={() => setMatrizEmAvaliacao(null)} style={{ position: 'absolute', top: '18px', right: '18px', border: 'none', background: 'transparent', fontSize: '1.7rem', color: '#475569', cursor: 'pointer', lineHeight: 1 }} aria-label="Fechar painel de avaliação">×</button>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ margin: 0, color: '#2563eb', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                    {ehAdminGeral ? 'Homologação Final' : 'Voto Consultivo do Comitê Gestor'}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <h2 style={{ margin: 0, fontSize: '1.9rem', color: '#0f172a' }}>Avaliar Matriz: {matrizEmAvaliacao.id}</h2>
                                    <p style={{ margin: 0, color: '#475569', fontSize: '1rem', maxWidth: '780px', lineHeight: 1.75 }}>
                                        {ehAdminGeral
                                            ? 'Como Administrador Geral, decida pela aprovação da matriz ou pelo retorno com solicitação de ajustes.'
                                            : 'Revise os dados enviados pelo usuário e registre seu voto consultivo técnico acompanhado de comentário.'}
                                    </p>
                                </div>
                            </div>

                            <section style={{ display: 'grid', gap: '1rem', background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Identificação</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                    <div style={estiloInfoItem}><span style={estiloInfoLabel}>ID</span><span style={estiloInfoValue}>{matrizEmAvaliacao.id}</span></div>
                                    <div style={estiloInfoItem}><span style={estiloInfoLabel}>Ação estratégica</span><span style={estiloInfoValue}>{matrizEmAvaliacao.nome}</span></div>
                                    <div style={estiloInfoItem}><span style={estiloInfoLabel}>Autor</span><span style={estiloInfoValue}>{matrizEmAvaliacao.criadoPor?.email || (typeof matrizEmAvaliacao.criadoPor === 'string' ? matrizEmAvaliacao.criadoPor : '-')}</span></div>
                                    <div style={estiloInfoItem}><span style={estiloInfoLabel}>Setor responsável</span><span style={estiloInfoValue}>{matrizEmAvaliacao.criadoPor?.setor || matrizEmAvaliacao.setor || '-'}</span></div>
                                </div>
                            </section>

                            <section style={{ display: 'grid', gap: '0.85rem', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <div>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Histórico de revisões</h3>
                                    <p style={{ margin: '0.45rem 0 0', color: '#64748b', lineHeight: 1.6 }}>
                                        Revisões anteriores permanecem disponíveis para consulta e não podem ser alteradas.
                                    </p>
                                </div>
                                {historicoMatriz?.matriz?.avaliadoPor && (
                                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.9rem 1rem' }}>
                                        <strong style={{ color: '#166534' }}>
                                            {historicoMatriz.matriz.status === 'APROVADO' ? 'Aprovada por' : 'Solicitou ajustes'}: {historicoMatriz.matriz.avaliadoPor.email}
                                        </strong>
                                        {historicoMatriz.matriz.dataAvaliacao && (
                                            <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                                {new Date(historicoMatriz.matriz.dataAvaliacao).toLocaleString('pt-BR')}
                                            </p>
                                        )}
                                        {historicoMatriz.matriz.comentarioComite && (
                                            <p style={{ margin: '0.55rem 0 0', color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                                                {historicoMatriz.matriz.comentarioComite}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {carregandoHistorico ? (
                                    <p style={{ margin: 0, color: '#64748b' }}>Carregando revisões...</p>
                                ) : historicoMatriz?.revisoes?.length ? (
                                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                                        {[...historicoMatriz.revisoes].reverse().map((revisao) => {
                                            const numeroRevisaoAtual = Math.max(...historicoMatriz.revisoes.map(item => item.numero));
                                            const revisaoAtual = revisao.numero === numeroRevisaoAtual;
                                            return (
                                                <div key={revisao.id} style={{ background: revisaoAtual ? '#eff6ff' : '#f8fafc', border: `1px solid ${revisaoAtual ? '#60a5fa' : '#e2e8f0'}`, borderLeft: `4px solid ${revisaoAtual ? '#2563eb' : '#94a3b8'}`, borderRadius: '10px', padding: '0.9rem 1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                        <strong style={{ color: '#0f172a' }}>Revisão {revisao.numero}</strong>
                                                        <span style={{ ...estiloBadgeStatus(revisaoAtual ? 'ENVIADO' : 'RASCUNHO'), backgroundColor: revisaoAtual ? '#dbeafe' : '#e2e8f0', color: revisaoAtual ? '#1d4ed8' : '#475569' }}>
                                                            {revisaoAtual ? 'Atual' : 'Somente leitura'}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: '0.45rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>
                                                        {Array.isArray(revisao.votos) ? `${revisao.votos.length} voto(s) registrado(s)` : 'Nenhum voto registrado'}
                                                        {revisao.criadoEm ? ` · ${new Date(revisao.criadoEm).toLocaleDateString('pt-BR')}` : ''}
                                                    </p>
                                                    {revisao.observacao && <p style={{ margin: '0.45rem 0 0', color: '#475569', fontSize: '0.88rem' }}>{revisao.observacao}</p>}
                                                    {Array.isArray(revisao.votos) && revisao.votos.length > 0 ? (
                                                        <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.85rem' }}>
                                                            {revisao.votos.map((voto) => (
                                                                <div key={voto.id} style={{ background: '#fff', border: '1px solid #dbe3ee', borderRadius: '9px', padding: '0.8rem 0.9rem' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                                        <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{voto.usuario?.email || 'Comitê Gestor'}</strong>
                                                                        <span style={{ fontWeight: 700, fontSize: '0.82rem', color: voto.voto === 'APROVAR' ? '#15803d' : '#b91c1c' }}>
                                                                            {voto.voto === 'APROVAR' ? 'APROVAR' : 'REJEITAR'}
                                                                        </span>
                                                                    </div>
                                                                    <p style={{ margin: '0.55rem 0 0', color: '#64748b', fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                                        Parecer pessoal
                                                                        {voto.createdAt ? ` · ${new Date(voto.createdAt).toLocaleDateString('pt-BR')}` : ''}
                                                                    </p>
                                                                    <p style={{ margin: '0.3rem 0 0', color: '#475569', fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                                                        {voto.comentario || 'Nenhum parecer registrado.'}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ margin: '0.85rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>Nenhum voto ou parecer registrado nesta revisão.</p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, color: '#64748b' }}>Nenhuma revisão disponível.</p>
                                )}
                            </section>

                            {matrizEmAvaliacao.oque && (
                                <section style={{ display: 'grid', gap: '1rem', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>5W2H da matriz (formato anterior)</h3>
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        <div style={estiloInfoItem}><span style={estiloInfoLabel}>O quê?</span><span style={estiloInfoValue}>{matrizEmAvaliacao.oque}</span></div>
                                        <div style={estiloInfoItem}><span style={estiloInfoLabel}>Por quê?</span><span style={estiloInfoValue}>{matrizEmAvaliacao.porque}</span></div>
                                        <div style={estiloInfoItem}><span style={estiloInfoLabel}>Onde?</span><span style={estiloInfoValue}>{matrizEmAvaliacao.onde}</span></div>
                                        <div style={estiloInfoItem}><span style={estiloInfoLabel}>Quando?</span><span style={estiloInfoValue}>{matrizEmAvaliacao.quando}</span></div>
                                        <div style={estiloInfoItem}><span style={estiloInfoLabel}>Como?</span><span style={estiloInfoValue}>{matrizEmAvaliacao.como}</span></div>
                                        <div style={estiloInfoItem}><span style={estiloInfoLabel}>Quanto?</span><span style={estiloInfoValue}>{matrizEmAvaliacao.quanto || '-'}</span></div>
                                    </div>
                                </section>
                            )}

                            <section style={{ display: 'grid', gap: '1rem', background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Indicadores e Ações Vinculadas</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                                    <div style={estiloMetricCard}><span style={estiloMetricLabel}>Progresso</span><strong style={estiloMetricValue}>{matrizEmAvaliacao.percentual}%</strong></div>
                                    <div style={estiloMetricCard}><span style={estiloMetricLabel}>Etapas</span><strong style={estiloMetricValue}>{(matrizEmAvaliacao.acoes || []).reduce((n, a) => n + (a.etapas || []).length, 0)}</strong></div>
                                    <div style={estiloMetricCard}><span style={estiloMetricLabel}>Tarefas</span><strong style={estiloMetricValue}>{contarTarefas((matrizEmAvaliacao.acoes || []).flatMap(a => a.etapas || [])).total}</strong></div>
                                </div>

                                {Array.isArray(matrizEmAvaliacao.acoes) && matrizEmAvaliacao.acoes.length > 0 && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {matrizEmAvaliacao.acoes.map((item, idx) => (
                                            <div key={item.acaoId || idx} style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.5rem', fontSize: '0.88rem' }}>
                                                <strong>{item.acaoId}</strong>: {item.acao?.diretriz || ''}
                                                {Array.isArray(item.etapas) && item.etapas.length > 0 && (
                                                    <div style={{ marginTop: '6px', fontSize: '0.82rem', color: '#475569' }}>
                                                        <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>
                                                            {item.etapas.length} {item.etapas.length === 1 ? 'etapa' : 'etapas'} e {contarTarefas(item.etapas).total} tarefas planejadas ({contarTarefas(item.etapas).concluidas} concluídas)
                                                        </span>
                                                        {item.etapas.map((etapa, i) => (
                                                            <details key={etapa.id || i} style={{ marginTop: '4px' }}>
                                                                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{etapa.titulo || `Etapa ${i + 1}`} (impacto {String(etapa.impacto || '-').toLowerCase()})</summary>
                                                                {(etapa.tarefas || []).map((t, j) => (
                                                                    <div key={t.id || j} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px', margin: '4px 0' }}>
                                                                        <strong>Tarefa {j + 1}:</strong> {t.titulo || '-'}<br />
                                                                        Por quê: {t.porque || '-'} | Quem: {t.quem || '-'} | Onde: {t.onde || '-'} | Quando: {t.quando || '-'}<br />
                                                                        Como: {t.como || '-'} | Quanto: {t.quanto || '-'}
                                                                    </div>
                                                                ))}
                                                                {etapa.observacao && <p style={{ margin: '4px 0 0 0' }}>Observações: {etapa.observacao}</p>}
                                                            </details>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* Votos Registrados pelo Comitê Gestor */}
                            {Array.isArray(matrizEmAvaliacao.votos) && matrizEmAvaliacao.votos.length > 0 && (
                                <section style={{ display: 'grid', gap: '0.75rem', background: '#f1f5f9', borderRadius: '16px', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
                                    <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>Votos Registrados pelos Usuários do Comitê Gestor</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {matrizEmAvaliacao.votos.map(v => (
                                            <div key={v.id} style={{ background: '#fff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <strong>{v.usuario?.email || 'Comitê Gestor'}</strong>
                                                    <span style={{ fontWeight: 'bold', color: v.voto === 'APROVAR' ? '#16a34a' : '#dc2626' }}>
                                                        {v.voto === 'APROVAR' ? '👍 APROVAR' : '👎 REJEITAR'}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, color: '#475569', fontSize: '0.85rem' }}>{v.comentario}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section style={{ display: 'grid', gap: '1rem', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>
                                            {ehAdminGeral ? 'Homologação Oficial (Admin Geral)' : 'Seu Voto Consultivo'}
                                        </h3>
                                        <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', lineHeight: 1.6 }}>
                                            {ehAdminGeral
                                                ? 'Defina o status final da matriz e o parecer oficial que será exibido para o autor.'
                                                : 'Defina seu posicionamento consultivo e registre observações técnicas para a decisão final.'}
                                        </p>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#eef2ff', borderRadius: '999px', padding: '0.65rem 0.9rem', color: '#3730a3', fontWeight: 700, fontSize: '0.95rem' }}>
                                        <span>Status Atual:</span>
                                        <span style={estiloBadgeStatus(matrizEmAvaliacao.status)}>{matrizEmAvaliacao.status}</span>
                                    </div>
                                </div>

                                {matrizEmAvaliacao.comentarioComite && matrizEmAvaliacao.comentarioComite !== '-' && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '1rem', color: '#92400e' }}>
                                        <p style={{ margin: 0, fontWeight: 700 }}>Parecer anterior registrado:</p>
                                        <p style={{ margin: '0.65rem 0 0 0', lineHeight: 1.7 }}>{matrizEmAvaliacao.comentarioComite}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSalvarParecer} style={{ display: 'grid', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                                            {ehAdminGeral ? 'Decisão Final / Status Oficial *' : 'Voto *'}
                                        </label>
                                        {ehAdminGeral ? (
                                            <select 
                                                value={decisao} 
                                                onChange={(e) => setDecisao(e.target.value)}
                                                style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid #cbd5e1', borderRadius: '12px', background: '#fff', fontSize: '0.95rem', color: '#0f172a' }}
                                            >
                                                <option value="APROVADO">Aprovado (Homologar)</option>
                                                <option value="PENDENTE">Pendente / Solicitar Ajustes</option>
                                            </select>
                                        ) : (
                                            <select 
                                                value={decisao} 
                                                onChange={(e) => setDecisao(e.target.value)}
                                                style={{ width: '100%', padding: '0.85rem 1rem', border: '1px solid #cbd5e1', borderRadius: '12px', background: '#fff', fontSize: '0.95rem', color: '#0f172a' }}
                                            >
                                                <option value="APROVAR">Aprovar (Recomendo aprovação)</option>
                                                <option value="REJEITAR">Rejeitar / Solicitar Ajustes</option>
                                            </select>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                                            {ehAdminGeral ? 'Parecer Oficial da Diretoria / Comitê Gestor *' : 'Justificativa do Voto / Parecer Técnico *'}
                                        </label>
                                        <textarea 
                                            rows="4" 
                                            value={comentario} 
                                            onChange={(e) => setComentario(e.target.value)} 
                                            required 
                                            placeholder="Digite as observações, fundamentos técnicos ou correções necessárias..."
                                            style={{ width: '100%', minHeight: '140px', padding: '1rem', border: '1px solid #cbd5e1', borderRadius: '14px', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.95rem', color: '#0f172a' }}
                                        ></textarea>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
                                        <button 
                                            type="submit" 
                                            disabled={enviando}
                                            style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.95rem 1.2rem', borderRadius: '14px', fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer', width: '100%', opacity: enviando ? 0.7 : 1 }}
                                        >
                                            {enviando ? 'Salvando...' : (ehAdminGeral ? 'Emitir Parecer Oficial' : 'Registrar Voto Consultivo')}
                                        </button>
                                        <button type="button" onClick={() => setMatrizEmAvaliacao(null)} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', padding: '0.95rem 1.2rem', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
                                            Fechar sem salvar
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const estiloBadgeStatus = (status) => {
    const s = String(status || '').toUpperCase();
    const base = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.45rem 0.85rem',
        borderRadius: '999px',
        fontSize: '0.82rem',
        fontWeight: 700,
        letterSpacing: '0.01em'
    };

    if (s === 'APROVADO') {
        return { ...base, backgroundColor: '#dcfce7', color: '#166534' };
    }
    if (s === 'ENVIADO') {
        return { ...base, backgroundColor: '#e0f2fe', color: '#0369a1' };
    }
    if (s === 'PENDENTE') {
        return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' };
    }
    if (s === 'RASCUNHO') {
        return { ...base, backgroundColor: '#fef9c3', color: '#a16207' };
    }
    return { ...base, backgroundColor: '#f1f5f9', color: '#475569' };
};

const estiloInfoItem = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    background: '#fff',
    borderRadius: '14px',
    padding: '1rem',
    border: '1px solid #e2e8f0'
};

const estiloInfoLabel = {
    fontSize: '0.84rem',
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
};

const estiloInfoValue = {
    fontSize: '0.98rem',
    color: '#0f172a',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap'
};

const estiloMetricCard = {
    background: '#fff',
    borderRadius: '16px',
    padding: '1rem',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
};

const estiloMetricLabel = {
    color: '#64748b',
    fontSize: '0.85rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

const estiloMetricValue = {
    color: '#0f172a',
    fontSize: '1.25rem',
    fontWeight: 700
};
