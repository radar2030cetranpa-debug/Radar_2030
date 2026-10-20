// src/components/ChecklistEtapas.jsx
import React, { useState } from 'react';
import {
    calcularPercentualEtapa,
    calcularPercentualEtapas,
    contarTarefas,
    criarEtapaVazia,
    criarTarefaVazia,
    CAMPOS_5W2H_TAREFA
} from '../services/progresso';
import Swal from 'sweetalert2';

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
    borderRadius: '10px', 
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
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-pencil-square"></i>
                    Explicar / Detalhar Tarefa (5W2H)
                </span>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Descreva os parâmetros de execução (o quê, por quê, quem, onde, quando, como e quanto).
                </p>
            </div>
            {CAMPOS_5W2H_TAREFA.map(campo => (
                <div key={campo.chave} style={{ gridColumn: campo.tipo === 'textarea' ? '1 / -1' : 'auto' }}>
                    <label style={estiloLabel}>{campo.rotulo}</label>
                    {campo.tipo === 'textarea' ? (
                        <textarea
                            rows={campo.chave === 'titulo' ? 2 : 3}
                            value={tarefa[campo.chave] || ''}
                            onChange={(e) => atualizar(campo.chave, e.target.value)}
                            placeholder={campo.dica}
                            style={{ ...estiloInput, resize: 'vertical', minHeight: campo.chave === 'titulo' ? '65px' : '85px', lineHeight: 1.5 }}
                        />
                    ) : (
                        <input
                            type={campo.tipo}
                            value={tarefa[campo.chave] || ''}
                            onChange={(e) => atualizar(campo.chave, e.target.value)}
                            placeholder={campo.dica}
                            style={estiloInput}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

/** Leitura do 5W2H de uma tarefa (fora do modo edição). */
function DetalhesTarefa({ tarefa }) {
    const campos = CAMPOS_5W2H_TAREFA.filter(c => c.chave !== 'titulo');
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem', marginTop: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.1rem' }}>
            <div style={{ gridColumn: '1 / -1', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="bi bi-card-text"></i>
                    Detalhamento da Tarefa (5W2H)
                </span>
            </div>
            {campos.map(campo => (
                <div key={campo.chave} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.95rem', gridColumn: campo.tipo === 'textarea' ? '1 / -1' : 'auto' }}>
                    <span style={estiloLabel}>{campo.rotulo}</span>
                    <span style={{ fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'pre-line' }}>{tarefa[campo.chave] || '-'}</span>
                </div>
            ))}
        </div>
    );
}

function CartaoTarefa({ tarefa, indice, editavelTitulos, editavelConclusao, onChange, onRemover }) {
    const [aberta, setAberta] = useState(editavelTitulos && !tarefa.titulo);

    return (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <input
                    type="checkbox"
                    checked={Boolean(tarefa.concluida)}
                    disabled={!editavelConclusao}
                    onChange={() => onChange({ ...tarefa, concluida: !tarefa.concluida, concluidaEm: !tarefa.concluida ? new Date().toISOString() : null })}
                    aria-label={`Tarefa ${indice + 1} concluída`}
                    style={{ width: '22px', height: '22px', cursor: editavelConclusao ? 'pointer' : 'not-allowed', flexShrink: 0, accentColor: '#16a34a' }}
                />
                <span style={{ flex: 1, fontSize: '1.05rem', color: tarefa.concluida ? '#16a34a' : '#0f172a', textDecoration: tarefa.concluida ? 'line-through' : 'none' }}>
                    <strong style={{ color: '#475569', marginRight: '0.5rem', fontSize: '1rem' }}>Tarefa {indice + 1}:</strong>
                    {tarefa.titulo || <em style={{ color: '#94a3b8' }}>sem descrição (clique em Explicar / Detalhar)</em>}
                </span>
                <button 
                    type="button" 
                    onClick={() => setAberta(!aberta)} 
                    style={{ 
                        border: '1px solid #bfdbfe', 
                        background: aberta ? '#eff6ff' : '#f8fafc', 
                        color: '#2563eb', 
                        borderRadius: '8px', 
                        padding: '0.45rem 0.85rem', 
                        cursor: 'pointer', 
                        fontSize: '0.9rem', 
                        fontWeight: 600,
                        transition: 'all 0.2s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <i className={`bi ${aberta ? 'bi-chevron-up' : 'bi-card-text'}`}></i>
                    {aberta ? 'Ocultar Detalhes' : 'Explicar / Detalhar'}
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
            {aberta && (editavelTitulos
                ? <FormularioTarefa tarefa={tarefa} onChange={onChange} />
                : <DetalhesTarefa tarefa={tarefa} />)}
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
        <div style={{ border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '1.35rem', background: '#f8fafc', display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', background: '#e2e8f0', padding: '0.35rem 0.75rem', borderRadius: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Etapa {indice + 1}
                </span>
                {editavelTitulos ? (
                    <input
                        type="text"
                        value={etapa.titulo}
                        onChange={(e) => onChange({ ...etapa, titulo: e.target.value })}
                        placeholder="Nome do Passo (ex: Passo 1: Levantamento de requisitos)"
                        style={{ ...estiloInput, flex: 1, minWidth: '240px', fontWeight: 600, fontSize: '1.05rem', padding: '0.75rem 1rem' }}
                    />
                ) : (
                    <span style={{ flex: 1, fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>{etapa.titulo || 'Etapa sem nome'}</span>
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
                    onClick={() => onChange({ ...etapa, tarefas: [...tarefas, criarTarefaVazia()] })}
                    style={{ justifySelf: 'start', background: '#fff', color: '#2563eb', border: '1.5px dashed #2563eb', borderRadius: '10px', padding: '0.65rem 1.15rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s ease' }}
                >
                    + Adicionar tarefa
                </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                <div>
                    <label style={estiloLabel}>Impacto da etapa na ação</label>
                    {editavelTitulos ? (
                        <select value={etapa.impacto || 'MEDIO'} onChange={(e) => onChange({ ...etapa, impacto: e.target.value })} style={{ ...estiloInput, cursor: 'pointer' }}>
                            <option value="BAIXO">Baixo</option>
                            <option value="MEDIO">Médio</option>
                            <option value="ALTO">Alto</option>
                        </select>
                    ) : (
                        <span style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>{{ BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' }[etapa.impacto] || '-'}</span>
                    )}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={estiloLabel}>Observações da etapa</label>
                    {editavelTitulos ? (
                        <textarea
                            rows={3}
                            value={etapa.observacao || ''}
                            onChange={(e) => onChange({ ...etapa, observacao: e.target.value })}
                            placeholder="Fatos ou circunstâncias a considerar na realização da etapa"
                            style={{ ...estiloInput, resize: 'vertical', minHeight: '85px', lineHeight: 1.5 }}
                        />
                    ) : (
                        <span style={{ fontSize: '0.95rem', color: '#0f172a', whiteSpace: 'pre-line' }}>{etapa.observacao || '-'}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Detalhamento de uma Ação: Etapas -> Tarefas, com 5W2H por tarefa.
 */
export function ChecklistEtapas({ acaoId, acaoLabel: _acaoLabel, etapas = [], onChange, editavelTitulos, editavelConclusao }) {
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
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', background: '#fff', boxShadow: '0 4px 12px rgba(15,23,42,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.45rem 0.95rem', borderRadius: '8px', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em' }}>
                        {acaoId}
                    </span>
                    {total > 0 && (
                        <span style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 600 }}>
                            {concluidas} de {total} tarefas concluídas ({etapas.length} {etapas.length === 1 ? 'etapa' : 'etapas'})
                        </span>
                    )}
                </div>
                <div style={{ textAlign: 'right', minWidth: '70px' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: corDoProgresso(percentual) }}>{percentual}%</span>
                </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}><BarraProgresso percentual={percentual} /></div>

            {etapas.length === 0 && (
                <p style={{ margin: '0 0 1rem 0', color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                    {editavelTitulos ? 'Nenhuma etapa definida ainda. Digite o nome do passo abaixo e clique em "+ Adicionar etapa".' : 'Nenhuma etapa foi definida para esta ação.'}
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
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        value={novaEtapa}
                        onChange={(e) => setNovaEtapa(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarEtapa(); } }}
                        placeholder="Nova etapa (Nome do Passo), ex: Passo 1: Levantamento de requisitos"
                        style={{ ...estiloInput, flex: 1, minWidth: '280px' }}
                    />
                    <button 
                        type="button" 
                        onClick={adicionarEtapa} 
                        style={{ 
                            background: '#2563eb', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '10px', 
                            padding: '0.75rem 1.4rem', 
                            fontSize: '0.98rem', 
                            fontWeight: 700, 
                            cursor: 'pointer', 
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
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
