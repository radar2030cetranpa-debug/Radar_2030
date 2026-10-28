// src/pages/AcoesEstrategicas.jsx
import React, { useState } from 'react';
import { acoesEstrategicas } from '../services/acoes_data';
import Swal from 'sweetalert2';
import '../styles/acoesEstrategicas.css';

const ACOES_POR_PAGINA = 20;

export function AcoesEstrategicas({ onSelecionarAcoes }) {
    const [termoBusca, setTermoBusca] = useState('');
    const [selecionada, setSelecionada] = useState('');
    const [paginaAtual, setPaginaAtual] = useState(1);

    // Filtra as ações com segurança contra valores nulos
    const acoesFiltradas = acoesEstrategicas.filter(acao => {
        const id = acao.id || '';
        const diretriz = acao.diretriz || '';
        const setor = acao.setor || '';
        const prazo = acao.prazo || '';
        const textoCompleto = `${id} ${diretriz} ${setor} ${prazo}`.toLowerCase();
        return textoCompleto.includes(termoBusca.toLowerCase());
    });
    const totalPaginas = Math.max(1, Math.ceil(acoesFiltradas.length / ACOES_POR_PAGINA));
    const inicioPagina = (paginaAtual - 1) * ACOES_POR_PAGINA;
    const acoesDaPagina = acoesFiltradas.slice(inicioPagina, inicioPagina + ACOES_POR_PAGINA);

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

    const handleLimparBusca = () => {
        setTermoBusca('');
        setPaginaAtual(1);
        setSelecionada('');
    };

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
                            onChange={(e) => {
                                setTermoBusca(e.target.value);
                                setPaginaAtual(1);
                                setSelecionada('');
                            }}
                            className="search-input"
                        />
                        {termoBusca && (
                            <button
                                type="button"
                                onClick={handleLimparBusca}
                                className="search-clear-button"
                                aria-label="Limpar busca"
                            >
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
                            <h2 className="panel-label">Lista de ações</h2>
                            <p className="panel-meta">Ações estratégicas disponíveis para planejamento.</p>
                        </div>
                        <div className="panel-meta" role="status" aria-live="polite">
                            {acoesFiltradas.length} {acoesFiltradas.length === 1 ? 'ação encontrada' : 'ações encontradas'}
                        </div>
                    </div>

                    <div
                        className="acoes-table-container"
                        role="region"
                        aria-label="Tabela de ações estratégicas"
                        tabIndex={0}
                    >
                        <table className="acoes-table">
                            <thead>
                                <tr>
                                    <th className="check-cell">Selecionar</th>
                                    <th className="id-cell">ID</th>
                                    <th>Diretriz Estratégica</th>
                                    <th className="prazo-cell">Prazo</th>
                                    <th>Setor Responsável</th>
                                </tr>
                            </thead>
                            <tbody>
                                {acoesFiltradas.length > 0 ? (
                                    acoesDaPagina.map(acao => {
                                        const chaveUnica = `${acao.id}-${acao.linhaPlanilha}`;
                                        const estaSelecionada = selecionada === chaveUnica;
                                        const prazoClasse = prazoClassName(acao.prazo);

                                        return (
                                            <tr key={chaveUnica} className={estaSelecionada ? 'selected-row' : ''}>
                                                <td className="check-cell">
                                                    <label className="acao-selection-label">
                                                        <input
                                                            type="radio"
                                                            name="acao-selecionada"
                                                            checked={estaSelecionada}
                                                            onChange={() => handleAcaoSelecionada(acao.id, acao.linhaPlanilha)}
                                                        />
                                                        <span className="sr-only">Selecionar ação {acao.id}</span>
                                                    </label>
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

                    {acoesFiltradas.length > 0 && (
                        <nav className="acoes-pagination" aria-label="Paginação das ações">
                            <p className="acoes-pagination-summary" aria-live="polite" aria-atomic="true">
                                Mostrando {inicioPagina + 1}–{Math.min(inicioPagina + ACOES_POR_PAGINA, acoesFiltradas.length)} de {acoesFiltradas.length}
                            </p>
                            <div className="acoes-pagination-controls">
                                <button
                                    type="button"
                                    className="acoes-pagination-button"
                                    onClick={() => setPaginaAtual(pagina => Math.max(1, pagina - 1))}
                                    disabled={paginaAtual === 1}
                                >
                                    Anterior
                                </button>
                                <span className="acoes-pagination-current" aria-current="page">
                                    Página {paginaAtual} de {totalPaginas}
                                </span>
                                <button
                                    type="button"
                                    className="acoes-pagination-button"
                                    onClick={() => setPaginaAtual(pagina => Math.min(totalPaginas, pagina + 1))}
                                    disabled={paginaAtual === totalPaginas}
                                >
                                    Próxima
                                </button>
                            </div>
                        </nav>
                    )}
                </div>

                <div className="detail-panel">
                    <div className="detail-card" aria-live="polite">
                        {selectedCount > 0 ? (
                            <div>
                                <p className="detail-eyebrow">Ação selecionada</p>
                                <div className="selected-action-pill">
                                    <strong>{selectedAction?.id}</strong>
                                    {selectedAction?.diretriz}
                                </div>
                                <p className="detail-text">
                                    Setor responsável: {selectedAction?.setor || selectedAction?.responsavel || 'Não atribuído'}
                                </p>
                                <div className="detail-note">
                                    A próxima etapa é preencher a matriz 5W2H desta ação.
                                </div>
                                <button type="button" className="floating-action-button" onClick={handleAvancarParaDetalhar}>
                                    Continuar para matriz 5W2H
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p className="detail-eyebrow">Próximo passo</p>
                                <p className="detail-text">
                                    Selecione uma ação na lista para conferir os dados e continuar para o planejamento 5W2H.
                                </p>
                            </div>
                        )}
                    </div>
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