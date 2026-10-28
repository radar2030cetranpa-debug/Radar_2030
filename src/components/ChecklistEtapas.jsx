// src/components/ChecklistEtapas.jsx
import React, { useState } from 'react';
import { Article, CaretUp, CheckCircle, PencilSimple } from '@phosphor-icons/react';
import {
    calcularPercentualEtapa,
    calcularPercentualEtapas,
    contarTarefas,
    criarEtapaVazia,
    criarTarefaVazia,
    CAMPOS_5W2H_TAREFA,
    obterNumeroReal,
    formatarNumeroReal,
    converterEntradaParaReal,
    formatarValorReal
} from '../services/progresso';
import Swal from 'sweetalert2';

const valorRealPreenchido = (valor) => obterNumeroReal(valor) !== null;

function corDoProgresso(percentual) {
    if (percentual >= 70) return '#16a34a';
    if (percentual >= 40) return '#d97706';
    return '#dc2626';
}

const estiloLabel = { 
    display: 'block', 
    fontSize: '0.85rem', 
    fontWeight: 700, 
    color: '#475569', 
    textTransform: 'uppercase', 
    letterSpacing: '0.04em', 
    marginBottom: '0.35rem' 
};

const estiloInput = { 
    width: '100%', 
    padding: '0.75rem 0.95rem', 
    border: '1.5px solid #cbd5e1', 
    borderRadius: '8px',
    fontSize: '0.98rem', 
    boxSizing: 'border-box', 
    fontFamily: 'inherit',
    color: '#0f172a',
    backgroundColor: '#fff'
};

function BarraProgresso({ percentual }) {
    return (
        <div style={{ height: '10px', borderRadius: '999px', background: '#e2e8f0', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percentual}%`, background: corDoProgresso(percentual), transition: 'width 0.3s ease' }} />
        </div>
    );
}

/** Campos 5W2H de uma tarefa (modo edição). */
function FormularioTarefa({ tarefa, onChange }) {
    const atualizar = (chave, valor) => onChange({ ...tarefa, [chave]: valor });
    const atualizarQuanto = (valor) => atualizar('quanto', converterEntradaParaReal(valor));
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem' }}>
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PencilSimple size={16} weight="bold" aria-hidden="true" />
                    Detalhes da tarefa (5W2H)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Preencha os campos para explicar como esta tarefa será executada.
                </p>
            </div>
            {CAMPOS_5W2H_TAREFA.map(campo => (
                <div
                    key={campo.chave}
                    style={{ gridColumn: campo.tipo === 'textarea' ? '1 / -1' : 'auto' }}
                >
                    <label style={estiloLabel}>{campo.rotulo}</label>
                    {campo.chave === 'quanto' ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                <span
                                    aria-hidden="true"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '0 0.85rem',
                                        border: `1.5px solid ${valorRealPreenchido(tarefa.quanto) ? '#cbd5e1' : '#dc2626'}`,
                                        borderRight: 0,
                                        borderRadius: '10px 0 0 10px',
                                        background: '#f1f5f9',
                                        color: '#475569',
                                        fontWeight: 700
                                    }}
                                >
                                    R$
                                </span>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={formatarNumeroReal(tarefa.quanto)}
                                    aria-invalid={!valorRealPreenchido(tarefa.quanto)}
                                    onChange={(e) => atualizarQuanto(e.target.value)}
                                    placeholder="0,00"
                                    style={{
                                        ...estiloInput,
                                        minWidth: 0,
                                        borderColor: valorRealPreenchido(tarefa.quanto) ? '#cbd5e1' : '#dc2626',
                                        borderLeft: 0,
                                        borderRadius: '0 10px 10px 0'
                                    }}
                                />
                            </div>
                            <span style={{ display: 'block', marginTop: '0.35rem', color: '#64748b', fontSize: '0.8rem' }}>
                                Digite apenas números; os dois últimos dígitos correspondem aos centavos.
                            </span>
                            {tarefa.quanto && !valorRealPreenchido(tarefa.quanto) && (
                                <span style={{ display: 'block', marginTop: '0.35rem', color: '#92400e', fontSize: '0.8rem' }}>
                                    Valor cadastrado anteriormente: {tarefa.quanto}. Informe o valor numérico em reais.
                                </span>
                            )}
                        </>
                    ) : campo.tipo === 'textarea' ? (
                        <textarea
                            rows={campo.chave === 'titulo' ? 2 : 3}
                            value={tarefa[campo.chave] || ''}
                            aria-invalid={!tarefa[campo.chave]?.trim()}
                            onChange={(e) => atualizar(campo.chave, e.target.value)}
                            placeholder={campo.dica}
                            style={{
                                ...estiloInput,
                                borderColor: tarefa[campo.chave]?.trim() ? '#cbd5e1' : '#dc2626',
                                resize: 'vertical',
                                minHeight: campo.chave === 'titulo' ? '65px' : '85px',
                                lineHeight: 1.5
                            }}
                        />
                    ) : (
                        <input
                            type={campo.tipo}
                            value={tarefa[campo.chave] || ''}
                            aria-invalid={!tarefa[campo.chave]?.trim()}
                            onChange={(e) => atualizar(campo.chave, e.target.value)}
                            placeholder={campo.dica}
                            style={{
                                ...estiloInput,
                                borderColor: tarefa[campo.chave]?.trim() ? '#cbd5e1' : '#dc2626'
                            }}
                        />
                    )}
                </div>
            ))}
            <div>
                <label style={estiloLabel} htmlFor={`impacto-tarefa-${tarefa.id}`}>Impacto da tarefa</label>
                <select
                    id={`impacto-tarefa-${tarefa.id}`}
                    value={tarefa.impacto || 'MEDIO'}
                    onChange={(e) => atualizar('impacto', e.target.value)}
                    style={{ ...estiloInput, cursor: 'pointer' }}
                >
                    <option value="BAIXO">Baixo</option>
                    <option value="MEDIO">Médio</option>
                    <option value="ALTO">Alto</option>
                </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
                <label style={estiloLabel} htmlFor={`observacao-tarefa-${tarefa.id}`}>Observações da tarefa</label>
                <textarea
                    id={`observacao-tarefa-${tarefa.id}`}
                    rows={3}
                    value={tarefa.observacao || ''}
                    onChange={(e) => atualizar('observacao', e.target.value)}
                    placeholder="Informações adicionais sobre a execução desta tarefa"
                    style={{ ...estiloInput, resize: 'vertical', minHeight: '85px', lineHeight: 1.5 }}
                />
            </div>
        </div>
    );
}

/** Leitura do 5W2H de uma tarefa (fora do modo edição). */
function DetalhesTarefa({ tarefa }) {
    const campos = CAMPOS_5W2H_TAREFA.filter(c => c.chave !== 'titulo');
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginTop: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.1rem' }}>
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Article size={16} weight="bold" aria-hidden="true" />
                    Detalhamento da Tarefa (5W2H)
                </span>
            </div>
            {campos.map(campo => (
                <div key={campo.chave} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.95rem', gridColumn: campo.tipo === 'textarea' ? '1 / -1' : 'auto' }}>
                    <span style={estiloLabel}>{campo.rotulo}</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'pre-line' }}>
                        {campo.chave === 'quanto' && valorRealPreenchido(tarefa.quanto)
                            ? formatarValorReal(tarefa.quanto)
                            : tarefa[campo.chave] || '-'}
                    </span>
                </div>
            ))}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.95rem' }}>
                <span style={estiloLabel}>Impacto da tarefa</span>
                <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>
                    {{ BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' }[tarefa.impacto || 'MEDIO']}
                </span>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.95rem', gridColumn: '1 / -1' }}>
                <span style={estiloLabel}>Observações da tarefa</span>
                <span style={{ fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'pre-line' }}>{tarefa.observacao || '-'}</span>
            </div>
        </div>
    );
}

function CartaoTarefa({ tarefa, indice, editavelTitulos, editavelConclusao, onChange, onRemover }) {
    const [aberta, setAberta] = useState(editavelTitulos && !tarefa.titulo);
    const camposObrigatorios = CAMPOS_5W2H_TAREFA;
    const camposPreenchidos = camposObrigatorios.filter(campo => campo.chave === 'quanto'
        ? valorRealPreenchido(tarefa.quanto)
        : tarefa[campo.chave]?.trim()).length;
    const detalhesCompletos = camposPreenchidos === camposObrigatorios.length;
    const painelDetalhesId = `detalhes-tarefa-${tarefa.id}`;

    return (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '1rem 1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <input
                    type="checkbox"
                    checked={Boolean(tarefa.concluida)}
                    disabled={!editavelConclusao}
                    onChange={() => onChange({ ...tarefa, concluida: !tarefa.concluida, concluidaEm: !tarefa.concluida ? new Date().toISOString() : null })}
                    aria-label={`Tarefa ${indice + 1} concluída`}
                    style={{ width: '22px', height: '22px', cursor: editavelConclusao ? 'pointer' : 'not-allowed', flexShrink: 0, accentColor: '#16a34a' }}
                />
                <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontSize: '1rem', color: tarefa.concluida ? '#16a34a' : '#0f172a', textDecoration: tarefa.concluida ? 'line-through' : 'none' }}>
                        <strong style={{ color: '#475569', marginRight: '0.5rem' }}>Tarefa {indice + 1}</strong>
                        {tarefa.titulo || <em style={{ color: '#94a3b8', textDecoration: 'none' }}>Adicione um título nos detalhes 5W2H</em>}
                    </div>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginTop: '0.3rem',
                            color: detalhesCompletos ? '#166534' : '#b91c1c',
                            fontSize: '0.78rem',
                            fontWeight: 600
                        }}
                    >
                        {detalhesCompletos && <CheckCircle size={14} weight="fill" aria-hidden="true" />}
                        {detalhesCompletos
                            ? 'Detalhamento completo'
                            : `${camposPreenchidos} de ${camposObrigatorios.length} campos preenchidos`}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setAberta(!aberta)}
                    aria-expanded={aberta}
                    aria-controls={painelDetalhesId}
                    style={{
                        border: '1px solid #0b4383',
                        background: aberta ? '#0b4383' : '#fff',
                        color: aberta ? '#fff' : '#0b4383',
                        borderRadius: '8px',
                        padding: '0.55rem 0.85rem',
                        cursor: 'pointer',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    {aberta
                        ? <CaretUp size={16} weight="bold" aria-hidden="true" />
                        : <Article size={16} weight="bold" aria-hidden="true" />}
                    {editavelTitulos
                        ? (aberta ? 'Fechar detalhes 5W2H' : detalhesCompletos ? 'Editar detalhes 5W2H' : 'Preencher detalhes 5W2H')
                        : (aberta ? 'Ocultar detalhes' : 'Ver detalhes 5W2H')}
                </button>
                {editavelTitulos && (
                    <button 
                        type="button" 
                        onClick={onRemover} 
                        aria-label={`Remover tarefa ${indice + 1}`} 
                        title="Remover tarefa"
                        style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0.2rem 0.5rem' }}
                    >
                        ×
                    </button>
                )}
            </div>
            <div id={painelDetalhesId} hidden={!aberta}>
                {aberta && (editavelTitulos
                    ? <FormularioTarefa tarefa={tarefa} onChange={onChange} />
                    : <DetalhesTarefa tarefa={tarefa} />)}
            </div>
        </div>
    );
}

function CartaoEtapa({ etapa, indice, editavelTitulos, editavelConclusao, onChange, onRemover }) {
    const tarefas = Array.isArray(etapa.tarefas) ? etapa.tarefas : [];
    const percentual = calcularPercentualEtapa(etapa);
    const etapaLegada = tarefas.length === 0 && !editavelTitulos;

    const atualizarTarefa = (id, nova) => onChange({ ...etapa, tarefas: tarefas.map(t => t.id === id ? nova : t) });

    const removerTarefa = async (id) => {
        const r = await Swal.fire({
            title: 'Excluir tarefa?',
            text: 'Os dados 5W2H desta tarefa serão perdidos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            reverseButtons: true
        });
        if (!r.isConfirmed) return;
        onChange({ ...etapa, tarefas: tarefas.filter(t => t.id !== id) });
    };

    return (
        <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '1.35rem', background: '#f8fafc', display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', background: '#e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.55rem' }}>
                    Etapa {indice + 1}
                </span>
                {editavelTitulos ? (
                    <div style={{ flex: 1, minWidth: '240px' }}>
                        <label htmlFor={`titulo-etapa-${etapa.id}`} style={estiloLabel}>Nome da etapa (passo)</label>
                        <input
                            id={`titulo-etapa-${etapa.id}`}
                            type="text"
                            value={etapa.titulo}
                            onChange={(e) => onChange({ ...etapa, titulo: e.target.value })}
                            placeholder="Ex.: Levantamento de requisitos"
                            style={{ ...estiloInput, fontWeight: 600, fontSize: '1.05rem' }}
                        />
                    </div>
                ) : (
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <span style={{ ...estiloLabel, marginBottom: '0.2rem' }}>Etapa (passo)</span>
                        <span style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>{etapa.titulo || 'Etapa sem nome'}</span>
                    </div>
                )}
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: corDoProgresso(percentual) }}>{percentual}%</span>
                {editavelTitulos && (
                    <button type="button" onClick={onRemover} aria-label={`Remover etapa ${etapa.titulo}`} title="Remover etapa" style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, padding: '0.2rem 0.5rem' }}>
                        ×
                    </button>
                )}
            </div>

            <BarraProgresso percentual={percentual} />

            {etapaLegada && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: '#475569' }}>
                    <input
                        type="checkbox"
                        checked={Boolean(etapa.concluida)}
                        disabled={!editavelConclusao}
                        onChange={() => onChange({ ...etapa, concluida: !etapa.concluida })}
                        style={{ width: '20px', height: '20px' }}
                    />
                    Etapa sem tarefas detalhadas (formato anterior)
                </label>
            )}

            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {tarefas.map((tarefa, i) => (
                    <CartaoTarefa
                        key={tarefa.id}
                        tarefa={tarefa}
                        indice={i}
                        editavelTitulos={editavelTitulos}
                        editavelConclusao={editavelConclusao}
                        onChange={(nova) => atualizarTarefa(tarefa.id, nova)}
                        onRemover={() => removerTarefa(tarefa.id)}
                    />
                ))}
            </div>

            {editavelTitulos && (
                <button
                    type="button"
                    onClick={() => {
                        const { impacto, observacao, ...etapaSemMetadados } = etapa;
                        onChange({
                            ...etapaSemMetadados,
                            tarefas: [
                                ...tarefas,
                                {
                                    ...criarTarefaVazia(),
                                    impacto: impacto || 'MEDIO',
                                    observacao: observacao || ''
                                }
                            ]
                        });
                    }}
                    style={{ justifySelf: 'start', background: '#fff', color: '#0b4383', border: '1.5px dashed #0b4383', borderRadius: '8px', padding: '0.65rem 1.15rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s ease' }}
                >
                    + Adicionar tarefa
                </button>
            )}

        </div>
    );
}

/**
 * Detalhamento de uma Ação: Etapas -> Tarefas, com 5W2H por tarefa.
 */
export function ChecklistEtapas({ acaoId, acaoLabel, etapas = [], onChange, editavelTitulos, editavelConclusao }) {
    const [novaEtapa, setNovaEtapa] = useState('');
    const percentual = calcularPercentualEtapas(etapas);
    const { total, concluidas } = contarTarefas(etapas);

    const adicionarEtapa = () => {
        const titulo = novaEtapa.trim();
        if (!titulo) return;
        onChange([...etapas, criarEtapaVazia(titulo)]);
        setNovaEtapa('');
    };

    const removerEtapa = async (id, titulo) => {
        const resultado = await Swal.fire({
            title: 'Excluir etapa?',
            text: `Você deseja excluir a etapa "${titulo}" e todas as suas tarefas?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#64748b',
            reverseButtons: true
        });
        if (!resultado.isConfirmed) return;
        onChange(etapas.filter(e => e.id !== id));
    };

    return (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.45rem 0.95rem', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em' }}>
                            {acaoId}
                        </span>
                        {acaoLabel && (
                            <p style={{ margin: '0.55rem 0 0', color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {acaoLabel}
                            </p>
                        )}
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                        {etapas.length} {etapas.length === 1 ? 'etapa' : 'etapas'}
                        {total > 0 && ` · ${concluidas} de ${total} tarefas concluídas`}
                    </span>
                </div>
                <div style={{ textAlign: 'right', minWidth: '70px' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: corDoProgresso(percentual) }}>{percentual}%</span>
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}><BarraProgresso percentual={percentual} /></div>
            {editavelTitulos && etapas.length > 0 && (
                <p style={{ margin: '0 0 1.1rem', color: '#475569', fontSize: '0.9rem' }}>
                    Cada etapa representa um passo da ação. Adicione uma ou mais tarefas e preencha os detalhes 5W2H.
                </p>
            )}

            {etapas.length === 0 && (
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                    {editavelTitulos ? 'Ainda não há etapas. Informe o nome do primeiro passo para começar.' : 'Nenhuma etapa foi definida para esta ação.'}
                </p>
            )}

            <div style={{ display: 'grid', gap: '1.1rem' }}>
                {etapas.map((etapa, i) => (
                    <CartaoEtapa
                        key={etapa.id}
                        etapa={etapa}
                        indice={i}
                        editavelTitulos={editavelTitulos}
                        editavelConclusao={editavelConclusao}
                        onChange={(nova) => onChange(etapas.map(e => e.id === etapa.id ? nova : e))}
                        onRemover={() => removerEtapa(etapa.id, etapa.titulo)}
                    />
                ))}
            </div>

            {editavelTitulos && (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: '280px' }}>
                        <label htmlFor={`nova-etapa-${acaoId}`} style={estiloLabel}>Nome do próximo passo</label>
                        <input
                            id={`nova-etapa-${acaoId}`}
                            type="text"
                            value={novaEtapa}
                            onChange={(e) => setNovaEtapa(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarEtapa(); } }}
                            placeholder="Ex.: Levantamento de requisitos"
                            style={estiloInput}
                        />
                    </div>
                    <button 
                        type="button" 
                        onClick={adicionarEtapa} 
                        disabled={!novaEtapa.trim()}
                        style={{ 
                            background: novaEtapa.trim() ? '#0b4383' : '#94a3b8',
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '8px',
                            padding: '0.75rem 1.4rem', 
                            fontSize: '0.98rem', 
                            fontWeight: 700, 
                            cursor: 'pointer', 
                            whiteSpace: 'nowrap',
                            boxShadow: 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        + Adicionar etapa
                    </button>
                </div>
            )}

            {!editavelTitulos && !editavelConclusao && etapas.length > 0 && (
                <p style={{ margin: '1rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    As tarefas só podem ser marcadas como concluídas depois que esta Matriz for aprovada pelo Comitê Gestor.
                </p>
            )}
        </div>
    );
}
