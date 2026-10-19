// src/pages/AcoesEstrategicas.jsx
import React, { useState } from 'react';
import { acoesEstrategicas } from '../services/acoes_data';
import Swal from 'sweetalert2';
import '../styles/acoesEstrategicas.css';

export function AcoesEstrategicas({ onSelecionarAcoes }) {
    const [termoBusca, setTermoBusca] = useState('');
    const [selecionada, setSelecionada] = useState('');

    // Filtra as ações com segurança contra valores nulos
    const acoesFiltradas = acoesEstrategicas.filter(acao => {
        const id = acao.id || '';
        const diretriz = acao.diretriz || '';
        const setor = acao.setor || '';
        const prazo = acao.prazo || '';
        const textoCompleto = `${id} ${diretriz} ${setor} ${prazo}`.toLowerCase();
        return textoCompleto.includes(termoBusca.toLowerCase());
    });

    const handleAcaoSelecionada = (id, linhaPlanilha) => {
        setSelecionada(`${id}-${linhaPlanilha}`);
    };

    const selectedActions = acoesEstrategicas.filter(a => `${a.id}-${a.linhaPlanilha}` === selecionada);
    const selectedCount = selectedActions.length;
    const selectedAction = selectedActions[0];

    const handleAvancarParaDetalhar = () => {
        if (selectedCount === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Nenhuma ação selecionada',
                text: 'Por favor, selecione pelo menos uma ação estratégica.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        if (typeof onSelecionarAcoes === 'function') {
            onSelecionarAcoes(selectedActions);
        }
    };

    const handleLimparBusca = () => setTermoBusca('');

    return (
        <div className="acoes-estrategicas-page">
            <div className="acoes-estrategicas-header">
                <div>
                    <p className="page-eyebrow">Planejamento Estratégico</p>
                    <h1 className="page-title">Ações Estratégicas</h1>
                    <p className="page-subtitle">Selecione uma ação estratégica para iniciar o planejamento da matriz 5W2H.</p>
                </div>
                <div className="search-block">
                    <label htmlFor="busca-acao" className="sr-only">Buscar ações estratégicas</label>
                    <div className="search-input-group">
                        <input
                            id="busca-acao"
                            type="text"
                            placeholder="Buscar por ID, diretriz ou setor…"
                            value={termoBusca}
                            onChange={(e) => setTermoBusca(e.target.value)}
                            className="search-input"
                        />
                        {termoBusca && (
                            <button type="button" onClick={handleLimparBusca} className="search-clear-button">
                                Limpar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="acoes-panel-grid">
                <div className="panel-card">
                    <div className="table-panel-header">
                        <div>
                            <p className="panel-label">Lista de ações</p>
                            <p className="panel-meta">Ações estratégicas disponíveis para planejamento.</p>
                        </div>
                        <div className="panel-meta">{acoesFiltradas.length} ações encontradas</div>
                    </div>

                    <div className="acoes-table-container">
                        <table className="acoes-table">
                            <thead>
                                <tr>
                                    <th className="check-cell">Sel.</th>
                                    <th className="id-cell">ID</th>
                                    <th>Diretriz Estratégica</th>
                                    <th className="prazo-cell">Prazo</th>
                                    <th>Setor Responsável</th>
                                </tr>
                            </thead>
                            <tbody>
                                {acoesFiltradas.length > 0 ? (
                                    acoesFiltradas.map(acao => {
                                        const chaveUnica = `${acao.id}-${acao.linhaPlanilha}`;
                                        const estaSelecionada = selecionada === chaveUnica;
                                        const prazoClasse = prazoClassName(acao.prazo);

                                        return (
                                            <tr key={chaveUnica} className={estaSelecionada ? 'selected-row' : ''} onClick={() => handleAcaoSelecionada(acao.id, acao.linhaPlanilha)} style={{ cursor: 'pointer' }}>
                                                <td className="check-cell" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="radio"
                                                        name="acao-selecionada"
                                                        checked={estaSelecionada}
                                                        onChange={() => handleAcaoSelecionada(acao.id, acao.linhaPlanilha)}
                                                        aria-label={`Selecionar ação ${acao.id}`}
                                                    />
                                                </td>
                                                <td className="id-cell">{acao.id}</td>
                                                <td className="diretriz-cell">{acao.diretriz || 'Não especificada'}</td>
                                                <td className="prazo-cell">
                                                    <span className={`prazo-badge ${prazoClasse}`}>{acao.prazo || 'Não definido'}</span>
                                                </td>
                                                <td>{acao.setor || acao.responsavel || 'Não atribuído'}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr className="no-results-row">
                                        <td colSpan="5">
                                            <div className="no-results-card">
                                                <strong>Nenhuma ação encontrada</strong>
                                                <p>Verifique o termo da busca e tente novamente.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="detail-panel">
                    {selectedCount > 0 && (
                        <div className="detail-card">
                            <div>
                                <p className="detail-eyebrow">Ação selecionada</p>
                                <p className="detail-text">{selectedAction?.setor ? `Setor responsável: ${selectedAction.setor}` : 'Setor responsável não atribuído.'}</p>
                                <p className="detail-text"><strong>{selectedCount}</strong> ação{selectedCount > 1 ? 's selecionadas' : ' selecionada'}.</p>
                                <div className="selected-actions-list">
                                    {selectedActions.map(acao => (
                                        <div key={`${acao.id}-${acao.linhaPlanilha}`} className="selected-action-pill">
                                            <strong>{acao.id}</strong>: {acao.diretriz}
                                        </div>
                                    ))}
                                </div>
                                <div className="detail-note">
                                    Use o botão abaixo para iniciar a matriz 5W2H com a seleção atual.
                                </div>
                                <button className="floating-action-button" onClick={handleAvancarParaDetalhar}>
                                    Criar matriz
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function prazoClassName(prazo) {
    if (!prazo) return '';
    if (prazo.includes('Curto')) return 'prazo-curto';
    if (prazo.includes('Médio')) return 'prazo-medio';
    if (prazo.includes('Longo')) return 'prazo-longo';
    return '';
}