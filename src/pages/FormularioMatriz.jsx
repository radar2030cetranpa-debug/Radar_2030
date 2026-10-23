// src/pages/FormularioMatriz.jsx
import React, { useState, useEffect } from 'react';
import { PencilSimple } from '@phosphor-icons/react';
import { ChecklistEtapas } from '../components/ChecklistEtapas';
import { calcularPercentualEtapas } from '../services/progresso';
import { 
    buscarMatriz, 
    criarMatriz, 
    atualizarMatriz, 
    enviarParaComite as enviarMatrizParaComite,
} from '../services/matrizes';
import Swal from 'sweetalert2';
import { RadarLoader } from '../components/RadarLoader';

export function FormularioMatriz({ 
    modo = 'novo', 
    matrizId, 
    matrizExistente,
    acoesSelecionadas = [], 
    usuarioLogado,
    onVoltar, 
    onSalvoSucesso 
}) {
    const [loading, setLoading] = useState(false);
    const [carregandoDados, setCarregandoDados] = useState(false);
    const [nome, setNome] = useState('');
    const [acoesComEtapas, setAcoesComEtapas] = useState([]);
    const [statusAtual, setStatusAtual] = useState('RASCUNHO');
    const [comentarioComite, setComentarioComite] = useState('');
    const [modoEdicaoEtapas, setModoEdicaoEtapas] = useState(false);
    
    // Armazena dados legados se existirem no banco, para não sobrescrever colunas antigas ao atualizar
    const [dadosLegados, setDadosLegados] = useState({});

    const preencherCampos = (data) => {
        setNome(data.nome || '');
        setStatusAtual(data.status || 'RASCUNHO');
        setComentarioComite(data.comentarioComite || '');
        setDadosLegados({
            oque: data.oque,
            porque: data.porque,
            como: data.como,
            quando: data.quando,
            onde: data.onde,
            quanto: data.quanto,
            impacto: data.impacto,
            observacao: data.observacao
        });

        const acoesData = data.acoes || data.acoesEstrategicas || [];
        if (acoesData.length > 0) {
            setAcoesComEtapas(acoesData.map(a => ({
                acaoId: a.acaoId || a.id,
                acao: a.acao || a,
                etapas: a.etapas || []
            })));
        }
    };

    const carregarMatriz = async (id) => {
        setCarregandoDados(true);
        try {
            const data = await buscarMatriz(id);
            preencherCampos(data);
        } catch (error) {
            console.error('Erro ao carregar matriz:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao carregar',
                text: error.message || 'Não foi possível carregar os dados da matriz.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setCarregandoDados(false);
        }
    };

    useEffect(() => {
        if (modo === 'editar' || modo === 'editar-aprovada') {
            const id = matrizId || matrizExistente?.id;
            if (id) {
                carregarMatriz(id);
            } else if (matrizExistente) {
                preencherCampos(matrizExistente);
            }
        } else if (modo === 'novo' && acoesSelecionadas.length > 0) {
            setAcoesComEtapas(acoesSelecionadas.map(a => ({ 
                acaoId: a.id, 
                acao: a,
                etapas: a.etapas || [] 
            })));
        }
    }, [modo, matrizId, matrizExistente, acoesSelecionadas]);

    const handleEtapasChange = (acaoId, novasEtapas) => {
        setAcoesComEtapas(prev => prev.map(a => 
            a.acaoId === acaoId ? { ...a, etapas: novasEtapas } : a
        ));
    };

    const calcularPercentualGeral = () => {
        if (acoesComEtapas.length === 0) return 0;
        const soma = acoesComEtapas.reduce((acc, a) => acc + calcularPercentualEtapas(a.etapas), 0);
        return Math.round(soma / acoesComEtapas.length);
    };

    const percentualGeral = calcularPercentualGeral();

    const validarFormulario = () => {
        return Boolean(nome.trim());
    };

    const montarPayload = () => {
        return {
            ...dadosLegados,
            nome: nome.trim(),
            percentual: percentualGeral,
            acoes: acoesComEtapas.map(a => ({
                acaoId: a.acaoId,
                etapas: a.etapas || []
            }))
        };
    };

    const salvarRascunho = async () => {
        if (!validarFormulario()) {
            Swal.fire({
                icon: 'warning',
                title: 'Nome da Matriz obrigatório',
                text: 'Por favor, informe o Nome da Matriz antes de salvar.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        setLoading(true);
        try {
            const payload = montarPayload();
            const idAtual = matrizId || matrizExistente?.id;
            
            if ((modo === 'editar' || modo === 'editar-aprovada') && idAtual) {
                await atualizarMatriz(idAtual, payload);
            } else {
                await criarMatriz(payload);
            }

            Swal.fire({
                icon: 'success',
                title: isEdicaoAprovadaAdmin ? 'Alterações salvas!' : 'Rascunho salvo!',
                text: isEdicaoAprovadaAdmin
                    ? 'A matriz aprovada foi atualizada com sucesso.'
                    : 'A matriz foi salva com sucesso.',
                timer: 2000,
                showConfirmButton: false
            });

            if (onSalvoSucesso) onSalvoSucesso();
        } catch (error) {
            console.error('Erro ao salvar rascunho:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao salvar',
                text: error.message || 'Ocorreu um erro ao salvar o rascunho.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setLoading(false);
        }
    };

    const enviarParaComite = async (e) => {
        e.preventDefault();

        if (!validarFormulario()) {
            Swal.fire({
                icon: 'warning',
                title: 'Nome da Matriz obrigatório',
                text: 'Por favor, informe o Nome da Matriz antes de enviar.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        // Verificar se todas as ações têm pelo menos uma etapa definida
        const acoesSemEtapas = acoesComEtapas.filter(a => !a.etapas || a.etapas.length === 0);
        if (acoesSemEtapas.length > 0) {
            const confirm = await Swal.fire({
                icon: 'warning',
                title: 'Ações sem etapas',
                text: `${acoesSemEtapas.length} ação(ões) não possuem etapas definidas. Deseja enviar mesmo assim?`,
                showCancelButton: true,
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#e63946',
                confirmButtonText: 'Sim, enviar',
                cancelButtonText: 'Cancelar'
            });
            if (!confirm.isConfirmed) return;
        }

        const result = await Swal.fire({
            title: 'Confirmar envio',
            text: 'Deseja enviar esta matriz para deliberação do Comitê Gestor?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#e63946',
            confirmButtonText: 'Sim, enviar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        try {
            const payload = montarPayload();
            const idAtual = matrizId || matrizExistente?.id;
            let targetId = idAtual;

            if ((modo === 'editar' || modo === 'editar-aprovada') && idAtual) {
                await atualizarMatriz(idAtual, payload);
            } else {
                const response = await criarMatriz(payload);
                targetId = response.id;
            }

            await enviarMatrizParaComite(targetId);

            Swal.fire({
                icon: 'success',
                title: 'Enviado com sucesso!',
                text: 'A matriz foi encaminhada para análise e deliberação do Comitê Gestor.',
                timer: 2000,
                showConfirmButton: false
            });

            if (onSalvoSucesso) onSalvoSucesso();
        } catch (error) {
            console.error('Erro ao enviar:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao enviar',
                text: error.message || 'Ocorreu um erro ao enviar a matriz.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setLoading(false);
        }
    };

    const isEdit = modo === 'editar' || modo === 'editar-aprovada';
    const isEdicaoAprovadaAdmin = modo === 'editar-aprovada' && usuarioLogado?.role === 'ADMIN_GERAL';
    const titulo = isEdicaoAprovadaAdmin ? 'Editar Matriz Aprovada' : (isEdit ? 'Editar Matriz' : 'Nova Matriz');
    const podeEditar = statusAtual === 'RASCUNHO' || statusAtual === 'PENDENTE' || isEdicaoAprovadaAdmin;
    const podeEnviar = statusAtual === 'RASCUNHO' || statusAtual === 'PENDENTE';
    const podeSalvarProgresso = isEdicaoAprovadaAdmin;
    const comentarioAtivo = statusAtual === 'PENDENTE' && comentarioComite;
    const podeEditarTitulosEtapas = modo === 'novo' || modoEdicaoEtapas || isEdicaoAprovadaAdmin;

    if (carregandoDados) {
        return (
            <div className="formulario-container" style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1.5rem' }}>
                <RadarLoader
                    tamanho="md"
                    mensagem="Carregando dados da matriz..."
                    submensagem="Aguarde enquanto os campos e etapas são carregados"
                />
            </div>
        );
    }

    return (
        <div className="formulario-container">
            <div className="formulario-header">
                <div>
                    <p className="formulario-eyebrow">Radar 2030</p>
                    <h1 className="formulario-title">{titulo}</h1>
                    <p className="formulario-subtitle">
                        {isEdit ? 'Atualize o nome da matriz, adicione etapas e detalhe as tarefas de execução.' : 'Cadastre o nome da matriz, adicione as etapas (passos) e tarefas detalhadas.'}
                    </p>
                </div>
                <button type="button" onClick={onVoltar} className="formulario-button-tertiary">
                    Voltar
                </button>
            </div>

            <div className="formulario-summary-card">
                <div>
                    <p className="summary-label">Ações estratégicas</p>
                    <p className="summary-value">{acoesComEtapas.length} ação(ões) vinculada(s)</p>
                </div>
                <div>
                    <p className="summary-label">ID da matriz</p>
                    <p className="summary-value">{isEdit ? (matrizId || matrizExistente?.id) : 'Será gerado ao salvar'}</p>
                </div>
                <div>
                    <p className="summary-label">Status atual</p>
                    <span className="summary-badge" style={estiloBadgeStatus(statusAtual)}>
                        {statusAtual}
                    </span>
                </div>
                <div>
                    <p className="summary-label">Andamento geral</p>
                    <p className="summary-value" style={{ fontWeight: 700 }}>{percentualGeral}%</p>
                </div>
            </div>

            {comentarioAtivo && (
                <div className="formulario-alert-card">
                    <p className="alert-title">Solicitação de ajustes do Comitê</p>
                    <p className="alert-text">{comentarioComite}</p>
                </div>
            )}

            <form onSubmit={enviarParaComite} className="formulario-form">
                
                {/* 01: NOME DA MATRIZ */}
                <section className="formulario-section">
                    <div className="section-header">
                        <div>
                            <span className="section-number">01</span>
                            <h2 className="section-title">Nome da Matriz</h2>
                        </div>
                        <p className="section-description">Título descritivo que identifica a matriz e o conjunto de entregas.</p>
                    </div>
                    <div>
                        <label className="formulario-label" htmlFor="nome">
                            Nome da Matriz / Ação <span className="required">*</span>
                        </label>
                        <input 
                            id="nome" 
                            type="text" 
                            value={nome} 
                            onChange={(e) => setNome(e.target.value)} 
                            required 
                            className="formulario-input" 
                            placeholder="Ex: Regulamentação do SET / PETRANS 2030"
                            disabled={!podeEditar}
                        />
                    </div>
                </section>

                {/* 02: ETAPAS E TAREFAS */}
                <section className="formulario-section">
                    <div className="section-header etapas-section-header">
                        <div>
                            <span className="section-number">02</span>
                            <h2 className="section-title">Etapas e Tarefas de Execução</h2>
                        </div>
                        {isEdit && !isEdicaoAprovadaAdmin && (
                            <button
                                type="button"
                                className={`etapas-edit-button${modoEdicaoEtapas ? ' is-active' : ''}`}
                                onClick={() => setModoEdicaoEtapas(!modoEdicaoEtapas)}
                                aria-pressed={modoEdicaoEtapas}
                                aria-label={modoEdicaoEtapas ? 'Desativar edição das etapas' : 'Editar etapas de execução'}
                                title={modoEdicaoEtapas ? 'Concluir edição das etapas' : 'Editar etapas de execução'}
                            >
                                <PencilSimple size={18} weight="bold" aria-hidden="true" />
                            </button>
                        )}
                        <p className="section-description">
                            {podeEditarTitulosEtapas
                                ? 'Adicione os passos da ação. Em cada tarefa, clique em "Explicar / Detalhar" para preencher os parâmetros operacionais.'
                                : statusAtual === 'APROVADO'
                                ? 'Marque as tarefas concluídas. O avanço percentual da ação e do PETRANS é atualizado em tempo real.'
                                : 'Relação de etapas e tarefas submetidas para análise e deliberação do Comitê Gestor.'}
                        </p>
                    </div>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {acoesComEtapas.map(acao => (
                            <ChecklistEtapas
                                key={acao.acaoId}
                                acaoId={acao.acaoId}
                                acaoLabel={acao.acao?.diretriz || `Ação ${acao.acaoId}`}
                                etapas={acao.etapas}
                                onChange={(novasEtapas) => handleEtapasChange(acao.acaoId, novasEtapas)}
                                editavelTitulos={podeEditarTitulosEtapas}
                                editavelConclusao={statusAtual === 'APROVADO' && isEdicaoAprovadaAdmin}
                                disabled={!podeEditar && !(statusAtual === 'APROVADO' && isEdicaoAprovadaAdmin)}
                            />
                        ))}
                    </div>
                </section>

                {/* BOTÕES DE AÇÃO */}
                <div className="formulario-actions">
                    <button 
                        type="button" 
                        onClick={onVoltar} 
                        className="formulario-button-tertiary"
                        disabled={loading}
                    >
                        Voltar
                    </button>
                    
                    {podeEditar && (
                        <>
                            <button
                                type="button"
                                onClick={salvarRascunho}
                                className="formulario-button-secondary"
                                disabled={loading}
                            >
                                {loading ? 'Salvando...' : 'Salvar Rascunho'}
                            </button>
                            
                            {podeEnviar && (
                                <button 
                                    type="submit" 
                                    className="formulario-button-primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Enviando...' : 'Enviar para o Comitê'}
                                </button>
                            )}
                        </>
                    )}
                    {podeSalvarProgresso && (
                        <button 
                            type="button" 
                            onClick={salvarRascunho}
                            className="formulario-button-primary"
                            disabled={loading}
                            style={{ background: '#16a34a' }}
                        >
                            {loading ? 'Salvando...' : 'Salvar alterações'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

const estiloBadgeStatus = (status) => {
    const base = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.35rem 0.85rem',
        borderRadius: '999px',
        fontSize: '0.82rem',
        fontWeight: 700,
        letterSpacing: '0.01em'
    };

    const statusMap = {
        'APROVADO': { ...base, backgroundColor: '#dcfce7', color: '#166534' },
        'ENVIADO': { ...base, backgroundColor: '#e0f2fe', color: '#0369a1' },
        'PENDENTE': { ...base, backgroundColor: '#fee2e2', color: '#991b1b' },
        'RASCUNHO': { ...base, backgroundColor: '#fef9c3', color: '#a16207' },
    };

    return statusMap[status] || { ...base, backgroundColor: '#f1f5f9', color: '#475569' };
};