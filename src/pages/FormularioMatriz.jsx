// src/pages/FormularioMatriz.jsx
import React, { useState, useEffect } from 'react';
import { ChecklistEtapas } from '../components/ChecklistEtapas';
import { calcularPercentualEtapas } from '../services/progresso';
import { 
    buscarMatriz, 
    criarMatriz, 
    atualizarMatriz, 
    enviarParaComite as enviarMatrizParaComite,
    atualizarProgressoMatriz
} from '../services/matrizes';
import Swal from 'sweetalert2';

export function FormularioMatriz({ 
    modo = 'novo', 
    matrizId, 
    matrizExistente,
    acoesSelecionadas = [], 
    usuarioLogado: _usuarioLogado, 
    onVoltar, 
    onSalvoSucesso 
}) {
    const [loading, setLoading] = useState(false);
    const [carregandoDados, setCarregandoDados] = useState(false);
    const [nome, setNome] = useState('');
    const [oque, setOque] = useState('');
    const [porque, setPorque] = useState('');
    const [como, setComo] = useState('');
    const [quando, setQuando] = useState('');
    const [onde, setOnde] = useState('');
    const [quanto, setQuanto] = useState('');
    const [impacto, setImpacto] = useState('MEDIO');
    const [observacao, setObservacao] = useState('');
    const [acoesComEtapas, setAcoesComEtapas] = useState([]);
    const [statusAtual, setStatusAtual] = useState('RASCUNHO');
    const [comentarioComite, setComentarioComite] = useState('');
    const [mostrarDetalhesMatriz, setMostrarDetalhesMatriz] = useState(false);
    const [modoEdicaoEtapas, setModoEdicaoEtapas] = useState(false);

    const parseCurrencyInput = (valor) => {
        if (!valor) return 0;
        const textoLimpo = String(valor)
            .replace(/\s/g, '')
            .replace(/R\$|\./g, '')
            .replace(/,/g, '.')
            .replace(/[^0-9.-]/g, '');
        return parseFloat(textoLimpo) || 0;
    };

    const formatarMoedaValor = (valor) => {
        if (!valor) return '';
        if (typeof valor === 'string' && valor.includes('R$')) return valor;
        const num = parseCurrencyInput(valor);
        if (num <= 0) return '';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(num);
    };

    const preencherCampos = (data) => {
        setNome(data.nome || '');
        setOque(data.oque || '');
        setPorque(data.porque || '');
        setComo(data.como || '');
        setQuando(data.quando || '');
        setOnde(data.onde || '');
        setQuanto(formatarMoedaValor(data.quanto));
        setImpacto(data.impacto || 'MEDIO');
        setObservacao(data.observacao || '');
        setStatusAtual(data.status || 'RASCUNHO');
        setComentarioComite(data.comentarioComite || '');

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
        if (modo === 'editar') {
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

    const handleQuantoChange = (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        if (!valor) {
            setQuanto('');
            return;
        }
        const numero = (parseInt(valor, 10) / 100).toFixed(2);
        const formatado = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numero);
        setQuanto(formatado);
    };

    const validarFormulario = () => {
        return Boolean(
            nome.trim() && 
            oque.trim() && 
            porque.trim() && 
            como.trim() && 
            quando && 
            onde.trim() && 
            quanto && 
            parseCurrencyInput(quanto) > 0
        );
    };

    const montarPayload = () => {
        return {
            nome: nome.trim(),
            oque: oque.trim(),
            porque: porque.trim(),
            como: como.trim(),
            quando,
            onde: onde.trim(),
            quanto: quanto.trim(),
            impacto,
            observacao: observacao.trim() || undefined,
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
                title: 'Campos obrigatórios',
                text: 'Por favor, preencha todos os campos principais antes de salvar.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        setLoading(true);
        try {
            const payload = montarPayload();
            const idAtual = matrizId || matrizExistente?.id;
            
            if (modo === 'editar' && idAtual) {
                await atualizarMatriz(idAtual, payload);
            } else {
                await criarMatriz(payload);
            }

            Swal.fire({
                icon: 'success',
                title: 'Rascunho salvo!',
                text: 'A matriz foi salva como rascunho com sucesso.',
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
                title: 'Campos obrigatórios',
                text: 'Preencha todos os campos obrigatórios antes de enviar.',
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
            text: 'Deseja enviar esta matriz para avaliação do comitê? Após enviar, não será possível editar.',
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

            if (modo === 'editar' && idAtual) {
                await atualizarMatriz(idAtual, payload);
            } else {
                const response = await criarMatriz(payload);
                targetId = response.id;
            }

            await enviarMatrizParaComite(targetId);

            Swal.fire({
                icon: 'success',
                title: 'Enviado com sucesso!',
                text: 'A matriz foi encaminhada para análise do comitê.',
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

    const salvarProgressoAprovado = async () => {
        setLoading(true);
        try {
            const payload = {
                percentual: percentualGeral,
                acoes: acoesComEtapas.map(a => ({
                    acaoId: a.acaoId,
                    etapas: a.etapas || []
                }))
            };
            const idAtual = matrizId || matrizExistente?.id;
            await atualizarProgressoMatriz(idAtual, payload);

            Swal.fire({
                icon: 'success',
                title: 'Progresso atualizado!',
                text: `O andamento da matriz foi salvo com sucesso (${percentualGeral}%).`,
                timer: 2000,
                showConfirmButton: false
            });

            if (onSalvoSucesso) onSalvoSucesso();
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao atualizar',
                text: error.message || 'Ocorreu um erro ao atualizar o progresso da matriz.',
                confirmButtonColor: '#2563eb'
            });
        } finally {
            setLoading(false);
        }
    };

    const isEdit = modo === 'editar';
    const titulo = isEdit ? 'Editar Matriz 5W2H' : 'Nova Matriz 5W2H';
    const podeEditar = statusAtual === 'RASCUNHO' || statusAtual === 'PENDENTE';
    const podeEnviar = statusAtual === 'RASCUNHO' || statusAtual === 'PENDENTE';
    const podeSalvarProgresso = statusAtual === 'APROVADO';
    const comentarioAtivo = statusAtual === 'PENDENTE' && comentarioComite;
    const podeEditarTitulosEtapas = modo === 'novo' || modoEdicaoEtapas;

    if (carregandoDados) {
        return (
            <div className="formulario-container">
                <div className="loading-spinner">Carregando dados...</div>
            </div>
        );
    }

    return (
        <div className="formulario-container">
            <div className="formulario-header">
                <div>
                    <p className="formulario-eyebrow">Formulário 5W2H</p>
                    <h1 className="formulario-title">{titulo}</h1>
                    <p className="formulario-subtitle">
                        {isEdit ? 'Atualize os campos da matriz e mantenha o mesmo registro durante o fluxo.' : 'Preencha as informações da nova matriz para envio ao Comitê.'}
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
                {(!podeEditar && statusAtual !== 'PENDENTE') && (
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'grid', gap: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setMostrarDetalhesMatriz(!mostrarDetalhesMatriz)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                cursor: 'pointer',
                                textAlign: 'left',
                                color: '#0f172a'
                            }}
                        >
                            <div>
                                <p style={{ margin: 0, fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Informações da ação / projeto</p>
                                <h2 style={{ margin: '0.15rem 0 0', fontSize: '1rem', color: '#0f172a' }}>Visualização da matriz</h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{ fontSize: '1.1rem', color: '#475569', transform: mostrarDetalhesMatriz ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s ease' }}>›</span>
                            </div>
                        </button>

                        {mostrarDetalhesMatriz && (
                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                        <p style={{ margin: '0 0 0.2rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Nome da ação</p>
                                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>{nome || '-'}</p>
                                    </div>
                                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                        <p style={{ margin: '0 0 0.2rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Onde</p>
                                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>{onde || '-'}</p>
                                    </div>
                                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                        <p style={{ margin: '0 0 0.2rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Quando</p>
                                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>{quando || '-'}</p>
                                    </div>
                                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                        <p style={{ margin: '0 0 0.2rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Quanto</p>
                                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>{quanto || '-'}</p>
                                    </div>
                                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.65rem 0.75rem' }}>
                                        <p style={{ margin: '0 0 0.2rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Impacto</p>
                                        <p style={{ margin: 0, color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>{impacto || '-'}</p>
                                    </div>
                                </div>

                                <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.8rem' }}>
                                    <p style={{ margin: '0 0 0.25rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>O quê?</p>
                                    <p style={{ margin: 0, color: '#0f172a', whiteSpace: 'pre-line', fontSize: '0.88rem' }}>{oque || '-'}</p>
                                </div>

                                <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.8rem' }}>
                                    <p style={{ margin: '0 0 0.25rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Por quê?</p>
                                    <p style={{ margin: 0, color: '#0f172a', whiteSpace: 'pre-line', fontSize: '0.88rem' }}>{porque || '-'}</p>
                                </div>

                                <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.8rem' }}>
                                    <p style={{ margin: '0 0 0.25rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Como?</p>
                                    <p style={{ margin: 0, color: '#0f172a', whiteSpace: 'pre-line', fontSize: '0.88rem' }}>{como || '-'}</p>
                                </div>

                                {observacao && (
                                    <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.7rem 0.8rem' }}>
                                        <p style={{ margin: '0 0 0.25rem', color: '#64748b', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Observações</p>
                                        <p style={{ margin: 0, color: '#0f172a', whiteSpace: 'pre-line', fontSize: '0.88rem' }}>{observacao}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {(!podeEditar && statusAtual !== 'PENDENTE') ? null : (
                    <>
                        <section className="formulario-section">
                            <div className="section-header">
                                <div>
                                    <span className="section-number">01</span>
                                    <h2 className="section-title">Nome da ação</h2>
                                </div>
                                <p className="section-description">Título que identifica a matriz e o projeto.</p>
                            </div>
                            <div>
                                <label className="formulario-label" htmlFor="nome">
                                    Nome da Ação / Projeto <span className="required">*</span>
                                </label>
                                <input 
                                    id="nome" 
                                    type="text" 
                                    value={nome} 
                                    onChange={(e) => setNome(e.target.value)} 
                                    required 
                                    className="formulario-input" 
                                    placeholder="Ex: Modernização de Servidores"
                                    disabled={!podeEditar}
                                />
                            </div>
                        </section>

                        <section className="formulario-section">
                            <div className="section-header">
                                <div>
                                    <span className="section-number">02</span>
                                    <h2 className="section-title">O quê?</h2>
                                </div>
                                <p className="section-description">Descreva com clareza o que será feito.</p>
                            </div>
                            <label className="formulario-label" htmlFor="oque">
                                O quê? (Descrição detalhada) <span className="required">*</span>
                            </label>
                            <textarea 
                                id="oque" 
                                rows="5" 
                                value={oque} 
                                onChange={(e) => setOque(e.target.value)} 
                                required 
                                className="formulario-textarea" 
                                placeholder="O que será feito..."
                                disabled={!podeEditar}
                            />
                        </section>

                        <section className="formulario-section">
                            <div className="section-header">
                                <div>
                                    <span className="section-number">03</span>
                                    <h2 className="section-title">Por quê?</h2>
                                </div>
                                <p className="section-description">Explique a justificativa e objetivos da ação.</p>
                            </div>
                            <label className="formulario-label" htmlFor="porque">
                                Por quê? (Justificativa) <span className="required">*</span>
                            </label>
                            <textarea 
                                id="porque" 
                                rows="5" 
                                value={porque} 
                                onChange={(e) => setPorque(e.target.value)} 
                                required 
                                className="formulario-textarea" 
                                placeholder="Por que essa ação é necessária..."
                                disabled={!podeEditar}
                            />
                        </section>

                        <section className="formulario-section formulario-grid-2">
                            <div>
                                <div className="section-header section-header-small">
                                    <span className="section-number">04</span>
                                    <h2 className="section-title">Onde?</h2>
                                </div>
                                <label className="formulario-label" htmlFor="onde">
                                    Onde? (Local de execução) <span className="required">*</span>
                                </label>
                                <input 
                                    id="onde" 
                                    type="text" 
                                    value={onde} 
                                    onChange={(e) => setOnde(e.target.value)} 
                                    required 
                                    className="formulario-input" 
                                    placeholder="Ex: Sede do Cetran/PA"
                                    disabled={!podeEditar}
                                />
                            </div>
                            <div>
                                <div className="section-header section-header-small">
                                    <span className="section-number">05</span>
                                    <h2 className="section-title">Quando?</h2>
                                </div>
                                <label className="formulario-label" htmlFor="quando">
                                    Quando? (Prazo / Data limite) <span className="required">*</span>
                                </label>
                                <input 
                                    id="quando" 
                                    type="date" 
                                    value={quando} 
                                    onChange={(e) => setQuando(e.target.value)} 
                                    required 
                                    className="formulario-input"
                                    disabled={!podeEditar}
                                />
                            </div>
                        </section>

                        <section className="formulario-section">
                            <div className="section-header">
                                <div>
                                    <span className="section-number">06</span>
                                    <h2 className="section-title">Como?</h2>
                                </div>
                                <p className="section-description">Detalhe a metodologia, passos e estratégia.</p>
                            </div>
                            <label className="formulario-label" htmlFor="como">
                                Como? (Metodologia / Passos) <span className="required">*</span>
                            </label>
                            <textarea 
                                id="como" 
                                rows="5" 
                                value={como} 
                                onChange={(e) => setComo(e.target.value)} 
                                required 
                                className="formulario-textarea" 
                                placeholder="Como será executado..."
                                disabled={!podeEditar}
                            />
                        </section>

                        <section className="formulario-section formulario-grid-2">
                            <div>
                                <div className="section-header section-header-small">
                                    <span className="section-number">07</span>
                                    <h2 className="section-title">Quanto?</h2>
                                </div>
                                <label className="formulario-label" htmlFor="quanto">
                                    Quanto? (Custo estimado R$) <span className="required">*</span>
                                </label>
                                <input 
                                    id="quanto" 
                                    type="text" 
                                    value={quanto} 
                                    onChange={handleQuantoChange} 
                                    required 
                                    className="formulario-input" 
                                    placeholder="R$ 0,00"
                                    disabled={!podeEditar}
                                />
                            </div>
                            <div className="impacto-field">
                                <label className="formulario-label" htmlFor="impacto">
                                    Impacto <span className="required">*</span>
                                </label>
                                <select 
                                    id="impacto" 
                                    value={impacto} 
                                    onChange={(e) => setImpacto(e.target.value)} 
                                    className="formulario-input" 
                                    style={{ appearance: 'none' }}
                                    disabled={!podeEditar}
                                >
                                    <option value="BAIXO">Baixo</option>
                                    <option value="MEDIO">Médio</option>
                                    <option value="ALTO">Alto</option>
                                </select>
                            </div>
                        </section>

                        <section className="formulario-section">
                            <div className="section-header">
                                <div>
                                    <span className="section-number">08</span>
                                    <h2 className="section-title">Observações</h2>
                                </div>
                                <p className="section-description">Registre notas adicionais ou lembretes sobre a ação.</p>
                            </div>
                            <label className="formulario-label" htmlFor="observacao">
                                Observações adicionais
                            </label>
                            <textarea 
                                id="observacao" 
                                rows="4" 
                                value={observacao} 
                                onChange={(e) => setObservacao(e.target.value)} 
                                className="formulario-textarea" 
                                placeholder="Notas extras se houver..."
                                disabled={!podeEditar}
                            />
                        </section>

                    </>
                )}

                <section className="formulario-section">
                    <div className="section-header etapas-section-header">
                        <div>
                            <span className="section-number">09</span>
                            <h2 className="section-title">Etapas de execução</h2>
                        </div>
                        {isEdit && (
                            <button
                                type="button"
                                className={`etapas-edit-button${modoEdicaoEtapas ? ' is-active' : ''}`}
                                onClick={() => setModoEdicaoEtapas(!modoEdicaoEtapas)}
                                aria-pressed={modoEdicaoEtapas}
                                aria-label={modoEdicaoEtapas ? 'Desativar edição das etapas' : 'Editar etapas de execução'}
                                title={modoEdicaoEtapas ? 'Concluir edição das etapas' : 'Editar etapas de execução'}
                            >
                                <i className="bi bi-pencil-square" aria-hidden="true" />
                            </button>
                        )}
                        <p className="section-description">
                            {podeEditarTitulosEtapas
                                ? 'Adicione, edite ou remova as etapas desta ação.'
                                : statusAtual === 'APROVADO'
                                ? 'Marque as etapas conforme forem concluídas. O percentual de andamento desta ação é calculado automaticamente.'
                                : 'Defina os passos necessários para concluir cada ação. Depois de aprovada pelo Comitê, essas etapas poderão ser marcadas como concluídas.'}
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
                                editavelConclusao={statusAtual === 'APROVADO'}
                                disabled={!podeEditar && statusAtual !== 'APROVADO'}
                            />
                        ))}
                    </div>
                </section>

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
                            onClick={salvarProgressoAprovado} 
                            className="formulario-button-primary"
                            disabled={loading}
                            style={{ background: '#16a34a' }}
                        >
                            {loading ? 'Salvando...' : 'Salvar Andamento'}
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