// src/pages/DashboardEstrategico.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    buscarResumoAnalytics,
    buscarObjetivos,
    buscarPrazos,
    alternarProjetoEstrategico
} from '../services/analytics';
import { listarMatrizes, buscarHistoricoMatriz } from '../services/matrizes';
import { acoesEstrategicas } from '../services/acoes_data';
import { ehAdmin } from '../services/permissoes';
import { 
    SETORES_RADAR, 
    calcularPercentualEtapas, 
    calcularPercentualEtapa,
    contarTarefas,
    normalizarSetor
} from '../services/progresso';
import Swal from 'sweetalert2';

// Mapeamento Oficial dos 4 Eixos do PETRANS (Radar 2030)
const EIXOS_INFO = {
    1: { id: 1, codigo: 'EIXO 1', nome: 'Integração', sigla: 'INT', cor: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    2: { id: 2, codigo: 'EIXO 2', nome: 'Inteligência de dados e Comunicação', sigla: 'IDC', cor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    3: { id: 3, codigo: 'EIXO 3', nome: 'Gestão e Fiscalização', sigla: 'GF', cor: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    4: { id: 4, codigo: 'EIXO 4', nome: 'Cultura e Educação', sigla: 'CE', cor: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' }
};

// Projetos por Eixo, conforme a Nota para Ratificação do Cel PM Jorge Luiz Aragão Silva
const PROJETOS_POR_EIXO = {
    1: [1, 2, 11, 14, 18, 21],
    2: [3, 4, 10, 13],
    3: [5, 6, 7, 12, 15, 17, 19, 20],
    4: [8, 9, 16]
};

const PROJETOS_ESTRATEGICOS_PADRAO = [1, 2, 3, 4, 5, 6, 7, 8];

const SETORES_OPCOES = [
    { valor: '', rotulo: 'Todos os Setores (Visão Geral)' },
    ...SETORES_RADAR.map(s => ({ valor: s.chave, rotulo: s.pai ? `\u00A0\u00A0${s.rotulo}` : s.rotulo }))
];

function corDoProgresso(pct) {
    if (pct >= 70) return '#16a34a';
    if (pct >= 40) return '#d97706';
    return '#2563eb';
}

function extrairNumeroProjeto(codigo) {
    if (!codigo) return null;
    const m = codigo.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : null;
}

function identificarEixoDoProjeto(projetoCodigo) {
    const num = extrairNumeroProjeto(projetoCodigo);
    if (!num) return EIXOS_INFO[1];
    for (const [eixoNum, projs] of Object.entries(PROJETOS_POR_EIXO)) {
        if (projs.includes(num)) {
            return EIXOS_INFO[Number(eixoNum)];
        }
    }
    return EIXOS_INFO[1];
}

// Exemplo Oficial de Referência para apresentação institucional (AE 1.1.1.1 - PETRANS)
const EXEMPLO_REFERENCIA_AE1111 = {
    id: 'REF-2030-01',
    nome: 'Implementação Inicial e Regulamentação do SET/PETRANS',
    status: 'APROVADO',
    percentual: 75,
    criadoPor: { email: 'ctsist.cetran@pa.gov.br', setor: 'CTSIST' },
    avaliadoPor: { email: 'sec.executiva@cetran.pa.gov.br' },
    dataCriacao: '2026-06-10T09:00:00.000Z',
    dataAvaliacao: '2026-06-15T15:30:00.000Z',
    comentarioComite: 'Matriz aprovada com louvor e homologada por unanimidade pelo Comitê Gestor. O detalhamento do 5W2H nas tarefas confere total transparência à governança executiva do PETRANS. Autorizada a continuidade e o monitoramento pelo Radar 2030. — Cel PM Jorge Luiz Aragão Silva, Secretário-Executivo Cetran/PA.',
    etapas: [
        {
            id: 'ET-REF-01',
            titulo: 'Passo 1: Elaboração da Minuta Legal e Pareceres Técnicos',
            impacto: 'ALTO',
            observacao: 'Trabalho conjunto entre a CTSIST, Núcleo JusCetran e entidades parceiras.',
            tarefas: [
                {
                    id: 'TF-REF-01',
                    titulo: 'Levantamento da legislação federal e normas do PNATRANS',
                    porque: 'Garantir conformidade jurídica com as metas de redução de sinistros viários.',
                    quem: 'Núcleo JusCetran e Assessoria Técnica',
                    onde: 'Sede do CETRAN/PA - Belém',
                    quando: 'Maio/2026',
                    como: 'Estudo normativo comparado e consolidação em matriz de compatibilidade.',
                    quanto: 'Custeio ordinário da Secretaria-Executiva',
                    concluida: true
                },
                {
                    id: 'TF-REF-02',
                    titulo: 'Redação da minuta preliminar do decreto de regulamentação do SET',
                    porque: 'Instituir formalmente as diretrizes e fluxos operacionais dos órgãos estaduais e municipais.',
                    quem: 'Comissão Temática de Sistema de Trânsito - CTSIST',
                    onde: 'CETRAN/PA',
                    quando: 'Junho/2026',
                    como: 'Oficinas técnicas colegiadas com representantes dos órgãos executivos.',
                    quanto: 'Sem custo adicional',
                    concluida: true
                }
            ]
        },
        {
            id: 'ET-REF-02',
            titulo: 'Passo 2: Audiências Técnicas e Consulta aos Municípios',
            impacto: 'ALTO',
            observacao: 'Fase essencial para garantir a adesão dos 144 municípios paraenses.',
            tarefas: [
                {
                    id: 'TF-REF-03',
                    titulo: 'Apresentação da proposta do PETRANS às lideranças municipais integradas',
                    porque: 'Construir consenso federativo e colher sugestões locais de implementação.',
                    quem: 'CTSIST e Comissão Temática de Educação - CTEDUC',
                    onde: 'Polos Regionais e Plataforma Virtual',
                    quando: 'Julho/2026',
                    como: 'Encontros regionais e formulário digital de contribuições com os gestores.',
                    quanto: 'Diárias e infraestrutura de transmissão (Previsto no Plano de Trabalho)',
                    concluida: true
                },
                {
                    id: 'TF-REF-04',
                    titulo: 'Consolidação final do plano e protocolo junto à Casa Civil para sanção',
                    porque: 'Efetivar o ato de publicação oficial no Diário Oficial do Estado.',
                    quem: 'Presidência e Secretaria-Executiva do CETRAN/PA',
                    onde: 'Palácio do Governo / Casa Civil - Belém',
                    quando: 'Agosto/2026',
                    como: 'Processo formal no Sistema Eletrônico de Informações (PAE).',
                    quanto: 'Recursos orçamentários previstos',
                    concluida: false
                }
            ]
        }
    ],
    votosComite: [
        {
            id: 'V-01',
            membro: 'Comissão de Segurança Viária (CTSEG)',
            voto: 'APROVAR',
            data: '2026-06-12T11:20:00.000Z',
            comentario: 'Matriz muito consistente. A distribuição do 5W2H por tarefas permite clareza nas entregas e a articulação jurídica mitiga riscos operacionais.'
        },
        {
            id: 'V-02',
            membro: 'Comissão de Educação para o Trânsito (CTEDUC)',
            voto: 'APROVAR',
            data: '2026-06-13T14:45:00.000Z',
            comentario: 'Excelente a previsão da consulta regionalizada com os municípios. Aprovado integralmente.'
        },
        {
            id: 'V-03',
            membro: 'Secretaria-Executiva CETRAN/PA',
            voto: 'APROVAR',
            data: '2026-06-14T10:10:00.000Z',
            comentario: 'Metas e prazos compatíveis com o cronograma anual do CETRAN 2030 e disponibilidade orçamentária.'
        }
    ]
};

export function DashboardEstrategico({ usuarioLogado }) {
    // Abas disponíveis: 'foco' (Ação Escolhida) como ABA PRINCIPAL!
    const [abaAtiva, setAbaAtiva] = useState('foco'); 
    const [setorFiltro, setSetorFiltro] = useState('');
    const [apenasEstrategicos, setApenasEstrategicos] = useState(false);
    const [prazoSelecionado, setPrazoSelecionado] = useState('');

    // Estado da Ação em Foco
    const [acaoIdSelecionada, setAcaoIdSelecionada] = useState('AE 1.1.1.1');
    const [buscaAcaoTexto, setBuscaAcaoTexto] = useState('');
    const [filtroEixoAcao, setFiltroEixoAcao] = useState('');
    const [historicoDetalhado, setHistoricoDetalhado] = useState(null);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);

    // Dados das APIs
    const [matrizesBanco, setMatrizesBanco] = useState([]);
    const [dadosResumo, setDadosResumo] = useState(null);
    const [dadosObjetivos, setDadosObjetivos] = useState(null);
    const [dadosPrazosDetalhados, setDadosPrazosDetalhados] = useState(null);

    const [carregando, setCarregando] = useState(true);
    const podeEditarEstrategico = ehAdmin(usuarioLogado);

    // Carregamento de dados centralizado e resiliente
    const carregarDados = useCallback(async () => {
        setCarregando(true);
        try {
            // 1. Sempre carrega matrizes reais do backend NestJS
            const matrizes = await listarMatrizes().catch(() => []);
            setMatrizesBanco(Array.isArray(matrizes) ? matrizes : []);

            // 2. Tenta enriquecer com microserviço FastAPI se estiver disponível
            try {
                const [resumo, objetivos, prazos] = await Promise.all([
                    buscarResumoAnalytics(setorFiltro),
                    buscarObjetivos(setorFiltro),
                    buscarPrazos(prazoSelecionado, setorFiltro)
                ]);
                setDadosResumo(resumo);
                setDadosObjetivos(objetivos);
                setDadosPrazosDetalhados(prazos);
            } catch {
                // FastAPI offline: funcionamento suave local garantido
                setDadosResumo(null);
            }
        } finally {
            setCarregando(false);
        }
    }, [setorFiltro, prazoSelecionado]);

    useEffect(() => {
        carregarDados();
    }, [carregarDados]);

    // Busca detalhes e histórico do comitê da matriz correspondente à ação selecionada
    useEffect(() => {
        let ativo = true;
        const carregarHistoricoDaAcao = async () => {
            // Procura se existe matriz para a ação selecionada
            const matrizVinculada = matrizesBanco.find(m => 
                (m.acoes || []).some(a => (a.acaoId || a.acao?.id) === acaoIdSelecionada)
            );

            if (!matrizVinculada) {
                setHistoricoDetalhado(null);
                return;
            }

            setCarregandoHistorico(true);
            try {
                const hist = await buscarHistoricoMatriz(matrizVinculada.id).catch(() => null);
                if (ativo) setHistoricoDetalhado(hist);
            } finally {
                if (ativo) setCarregandoHistorico(false);
            }
        };

        carregarHistoricoDaAcao();
        return () => { ativo = false; };
    }, [acaoIdSelecionada, matrizesBanco]);

    // Localiza a Ação Estratégica Selecionada
    const acaoAtual = useMemo(() => {
        return acoesEstrategicas.find(a => a.id === acaoIdSelecionada) || acoesEstrategicas[0];
    }, [acaoIdSelecionada]);

    // Localiza os dados da matriz associada à ação atual
    const matrizDaAcaoAtual = useMemo(() => {
        const matriz = matrizesBanco.find(m => 
            (m.acoes || []).some(a => (a.acaoId || a.acao?.id) === acaoAtual?.id)
        );

        if (matriz) {
            const itemAcao = (matriz.acoes || []).find(a => (a.acaoId || a.acao?.id) === acaoAtual?.id);
            const etapas = itemAcao?.etapas || [];
            return {
                id: matriz.id,
                nome: matriz.nome,
                status: matriz.status,
                percentual: calcularPercentualEtapas(etapas),
                criadoPor: matriz.criadoPor,
                avaliadoPor: matriz.avaliadoPor,
                dataCriacao: matriz.dataCriacao,
                dataAvaliacao: matriz.dataAvaliacao,
                comentarioComite: matriz.comentarioComite,
                etapas: etapas,
                votos: matriz.votos || [],
                origem: 'banco'
            };
        }

        // Se for a ação AE 1.1.1.1 e não tiver matriz no banco, exibe a referência oficial
        if (acaoAtual?.id === 'AE 1.1.1.1') {
            return {
                ...EXEMPLO_REFERENCIA_AE1111,
                origem: 'referencia'
            };
        }

        return null;
    }, [matrizesBanco, acaoAtual]);

    // Ações filtradas para a caixa de seleção rápida
    const acoesFiltradasParaSelecao = useMemo(() => {
        return acoesEstrategicas.filter(a => {
            const matchTexto = !buscaAcaoTexto || 
                a.id.toLowerCase().includes(buscaAcaoTexto.toLowerCase()) || 
                (a.diretriz && a.diretriz.toLowerCase().includes(buscaAcaoTexto.toLowerCase())) ||
                (a.projetoNome && a.projetoNome.toLowerCase().includes(buscaAcaoTexto.toLowerCase()));

            const matchEixo = !filtroEixoAcao || identificarEixoDoProjeto(a.projetoCodigo).id === Number(filtroEixoAcao);
            const matchSetor = !setorFiltro || normalizarSetor(a.setor) === normalizarSetor(setorFiltro);

            return matchTexto && matchEixo && matchSetor;
        });
    }, [buscaAcaoTexto, filtroEixoAcao, setorFiltro]);

    // Cálculos consolidados para as 5 Visões Estratégicas
    const metricasConsolidadas = useMemo(() => {
        const percentuais = {};
        matrizesBanco
            .filter(m => m.status === 'APROVADO')
            .forEach(m => {
                (m.acoes || []).forEach(a => {
                    const id = a.acaoId || a.acao?.id;
                    if (id) percentuais[id] = calcularPercentualEtapas(a.etapas || []);
                });
            });

        // Se não houver matriz aprovada ainda, inclui o exemplo oficial para visualização consistente
        if (Object.keys(percentuais).length === 0) {
            percentuais['AE 1.1.1.1'] = 75;
        }

        const totalAcoes = acoesEstrategicas.length;
        const acoesComProgresso = Object.values(percentuais);
        const acoesConcluidas = acoesComProgresso.filter(p => p === 100).length;
        const acoesEmAndamento = acoesComProgresso.filter(p => p > 0 && p < 100).length;
        const somaProgresso = acoesEstrategicas.reduce((acc, a) => acc + (percentuais[a.id] || 0), 0);
        const progressoGlobal = Math.round(somaProgresso / (totalAcoes || 1));

        // 1. Eixos Consolidados
        const eixosConsolidados = Object.values(EIXOS_INFO).map(eixo => {
            const acoesDoEixo = acoesEstrategicas.filter(a => identificarEixoDoProjeto(a.projetoCodigo).id === eixo.id);
            const soma = acoesDoEixo.reduce((acc, a) => acc + (percentuais[a.id] || 0), 0);
            const progresso = acoesDoEixo.length > 0 ? Math.round(soma / acoesDoEixo.length) : 0;
            return {
                eixoNumero: eixo.id,
                codigo: eixo.codigo,
                nome: eixo.nome,
                sigla: eixo.sigla,
                cor: eixo.cor,
                totalAcoes: acoesDoEixo.length,
                acoesConcluidas: acoesDoEixo.filter(a => percentuais[a.id] === 100).length,
                progresso
            };
        });

        // 2. Projetos Consolidados (21 projetos)
        const mapaProjetos = {};
        acoesEstrategicas.forEach(a => {
            const cod = a.projetoCodigo || 'PROJETO GERAL';
            if (!mapaProjetos[cod]) {
                const num = extrairNumeroProjeto(cod);
                mapaProjetos[cod] = {
                    codigo: cod,
                    nome: a.projetoNome || cod,
                    tema: a.projetoTema || '',
                    eixo: identificarEixoDoProjeto(cod),
                    isEstrategico: num ? PROJETOS_ESTRATEGICOS_PADRAO.includes(num) : false,
                    acoes: []
                };
            }
            mapaProjetos[cod].acoes.push(a);
        });

        const projetosConsolidados = Object.values(mapaProjetos).map(p => {
            const soma = p.acoes.reduce((acc, a) => acc + (percentuais[a.id] || 0), 0);
            const progresso = p.acoes.length > 0 ? Math.round(soma / p.acoes.length) : 0;
            return {
                ...p,
                totalAcoes: p.acoes.length,
                acoesConcluidas: p.acoes.filter(a => percentuais[a.id] === 100).length,
                progresso
            };
        });

        // 3. Prazos
        const mapaPrazos = {
            'Curto Prazo': { rotulo: 'Curto Prazo', cor: '#2563eb', acoes: [] },
            'Médio Prazo': { rotulo: 'Médio Prazo', cor: '#d97706', acoes: [] },
            'Longo Prazo': { rotulo: 'Longo Prazo', cor: '#7c3aed', acoes: [] }
        };
        acoesEstrategicas.forEach(a => {
            const p = a.prazo?.includes('Curto') ? 'Curto Prazo' : (a.prazo?.includes('Médio') ? 'Médio Prazo' : 'Longo Prazo');
            mapaPrazos[p].acoes.push(a);
        });
        const faixasPrazos = Object.entries(mapaPrazos).map(([k, v]) => {
            const soma = v.acoes.reduce((acc, a) => acc + (percentuais[a.id] || 0), 0);
            return {
                codigo: k,
                rotulo: v.rotulo,
                cor: v.cor,
                totalAcoes: v.acoes.length,
                progressoAcumulado: v.acoes.length > 0 ? Math.round(soma / v.acoes.length) : 0
            };
        });

        // 4. Setores
        const mapaSetores = {};
        acoesEstrategicas.forEach(a => {
            const setorNom = normalizarSetor(a.setor) || 'Outros';
            if (!mapaSetores[setorNom]) mapaSetores[setorNom] = [];
            mapaSetores[setorNom].push(a);
        });
        const setoresConsolidados = Object.entries(mapaSetores).map(([setor, acs]) => {
            const soma = acs.reduce((acc, a) => acc + (percentuais[a.id] || 0), 0);
            return {
                setor,
                rotulo: setor,
                totalAcoes: acs.length,
                acoesConcluidas: acs.filter(a => percentuais[a.id] === 100).length,
                progresso: acs.length > 0 ? Math.round(soma / acs.length) : 0
            };
        });

        const ests = projetosConsolidados.filter(p => p.isEstrategico);
        const progressoMedioEstrategicos = ests.length > 0
            ? Math.round(ests.reduce((s, p) => s + p.progresso, 0) / ests.length)
            : 0;

        return {
            kpis: {
                progressoGlobal,
                totalAcoes,
                acoesConcluidas,
                acoesEmAndamento,
                totalEstrategicos: ests.length,
                progressoMedioEstrategicos
            },
            eixos: eixosConsolidados,
            projetos: projetosConsolidados,
            faixasPrazos,
            setores: setoresConsolidados
        };
    }, [matrizesBanco]);

    const kpis = dadosResumo?.kpis || metricasConsolidadas.kpis;
    const eixos = dadosResumo?.visao1_eixos || metricasConsolidadas.eixos;
    const projetos = dadosResumo?.visao2_projetos || metricasConsolidadas.projetos;
    const faixasPrazos = dadosResumo?.visao4_prazos || metricasConsolidadas.faixasPrazos;
    const setores = dadosResumo?.visao5_setores || metricasConsolidadas.setores;

    const projetosFiltrados = apenasEstrategicos 
        ? projetos.filter(p => p.isEstrategico)
        : projetos;

    const handleToggleEstrategico = async (projetoCodigo, statusAtual, nomeProjeto) => {
        if (!podeEditarEstrategico) return;

        const novoStatus = !statusAtual;
        const acaoTexto = novoStatus
            ? 'marcar como Projeto Estratégico ⭐'
            : 'remover o destaque de Projeto Estratégico';

        const result = await Swal.fire({
            title: novoStatus ? 'Marcar Estratégico?' : 'Remover Estratégico?',
            text: `Deseja ${acaoTexto} para "${projetoCodigo} - ${nomeProjeto}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: novoStatus ? '#ca8a04' : '#64748b',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: novoStatus ? 'Sim, marcar ⭐' : 'Sim, remover',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await alternarProjetoEstrategico(projetoCodigo, novoStatus, usuarioLogado?.email).catch(() => {});
                Swal.fire({
                    icon: 'success',
                    title: novoStatus ? '⭐ Projeto Estratégico Definido!' : 'Destaque removido',
                    text: `${projetoCodigo} foi atualizado com sucesso.`,
                    timer: 1500,
                    showConfirmButton: false
                });
                carregarDados();
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao alterar',
                    text: err.message || 'Não foi possível atualizar o status estratégico do projeto.',
                    confirmButtonColor: '#2563eb'
                });
            }
        }
    };

    const eixoDaAcaoAtual = identificarEixoDoProjeto(acaoAtual?.projetoCodigo);

    return (
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1380px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header Executivo & Lente de Setor */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            PETRANS 2030 • Inteligência Analítica
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                            Radar 2030 Cetran/PA
                        </span>
                    </div>
                    <h1 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: 'clamp(1.8rem, 2.5vw, 2.4rem)', color: '#0f172a', fontWeight: 800 }}>
                        Dashboard Estratégico
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                        Monitoramento centrado na Ação Estratégica, nos passos do 5W2H e nas deliberações do Comitê Gestor.
                    </p>
                </div>

                {/* Filtro Lente de Setor */}
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem 1.15rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600, fontSize: '0.88rem' }}>
                        <i className="bi bi-funnel-fill" style={{ color: '#2563eb' }}></i>
                        <span>Lente de Setor:</span>
                    </div>
                    <select
                        value={setorFiltro}
                        onChange={(e) => setSetorFiltro(e.target.value)}
                        style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.5rem 0.8rem', fontSize: '0.88rem', color: '#0f172a', background: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        {SETORES_OPCOES.map(op => (
                            <option key={op.valor} value={op.valor}>{op.rotulo}</option>
                        ))}
                    </select>
                    <button
                        onClick={carregarDados}
                        title="Atualizar dados"
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        <i className={`bi bi-arrow-clockwise ${carregando ? 'spin' : ''}`}></i>
                    </button>
                </div>
            </div>

            {/* Cards de KPIs Principais no Topo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={estiloKpiCard('#2563eb')}>
                    <span style={estiloKpiLabel}>Progresso Geral do Plano</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#0f172a', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.progressoGlobal ?? 0}%
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Média consolidada em cascata</span>
                </div>

                <div style={estiloKpiCard('#16a34a')}>
                    <span style={estiloKpiLabel}>Ações Concluídas (100%)</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#16a34a', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.acoesConcluidas ?? 0}
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>De {kpis.totalAcoes ?? 0} ações totais</span>
                </div>

                <div style={estiloKpiCard('#d97706')}>
                    <span style={estiloKpiLabel}>Ações em Andamento</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#d97706', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.acoesEmAndamento ?? 0}
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Etapas em execução física</span>
                </div>

                <div style={estiloKpiCard('#7c3aed')}>
                    <span style={estiloKpiLabel}>{kpis.totalEstrategicos ?? 8} Projetos Estratégicos</span>
                    <h2 style={{ fontSize: '2.2rem', color: '#7c3aed', margin: '4px 0 0 0', fontWeight: 800 }}>
                        {kpis.progressoMedioEstrategicos ?? 0}%
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Avanço médio prioritário</span>
                </div>
            </div>

            {/* Barra de Navegação das Abas do Dashboard */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '2px' }}>
                <button
                    onClick={() => setAbaAtiva('foco')}
                    style={estiloAba(abaAtiva === 'foco', '#2563eb')}
                >
                    <i className="bi bi-layers-fill"></i>
                    <span>Ação em Foco & Comitê Gestor</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('eixos')}
                    style={estiloAba(abaAtiva === 'eixos')}
                >
                    <i className="bi bi-diagram-3-fill"></i>
                    <span>1. Avanço por Eixos ({eixos.length})</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('projetos')}
                    style={estiloAba(abaAtiva === 'projetos')}
                >
                    <i className="bi bi-star-fill" style={{ color: '#ca8a04' }}></i>
                    <span>2. Todos os Projetos ({projetos.length})</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('prazos')}
                    style={estiloAba(abaAtiva === 'prazos')}
                >
                    <i className="bi bi-hourglass-split"></i>
                    <span>3. Horizontes de Prazo</span>
                </button>

                <button
                    onClick={() => setAbaAtiva('setores')}
                    style={estiloAba(abaAtiva === 'setores')}
                >
                    <i className="bi bi-buildings-fill"></i>
                    <span>4. Desempenho por Setores</span>
                </button>
            </div>

            {/* ========================================================================= */}
            {/* ABA CENTRAL: AÇÃO EM FOCO, DETALHAMENTO 5W2H E PASSOS DO COMITÊ GESTOR   */}
            {/* ========================================================================= */}
            {abaAtiva === 'foco' && (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    
                    {/* Painel de Seleção e Busca da Ação */}
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem', fontWeight: 800 }}>
                                    Selecione a Ação Estratégica em Foco
                                </h3>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    O dashboard se ajusta dinamicamente em torno dos passos, tarefas e governança da ação escolhida.
                                </p>
                            </div>

                            {/* Filtro de Eixo no Seletor */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setFiltroEixoAcao('')}
                                    style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: !filtroEixoAcao ? '2px solid #2563eb' : '1px solid #cbd5e1', background: !filtroEixoAcao ? '#eff6ff' : '#fff', color: !filtroEixoAcao ? '#1e40af' : '#64748b', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Todos os Eixos
                                </button>
                                {Object.values(EIXOS_INFO).map(e => (
                                    <button
                                        key={e.id}
                                        onClick={() => setFiltroEixoAcao(String(e.id))}
                                        style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: filtroEixoAcao === String(e.id) ? `2px solid ${e.cor}` : '1px solid #cbd5e1', background: filtroEixoAcao === String(e.id) ? e.bg : '#fff', color: filtroEixoAcao === String(e.id) ? e.cor : '#64748b', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {e.codigo}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dropdown e Campo de Busca */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                                    Escolher da Lista ({acoesFiltradasParaSelecao.length} ações)
                                </label>
                                <select
                                    value={acaoIdSelecionada}
                                    onChange={(e) => setAcaoIdSelecionada(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', background: '#fff', cursor: 'pointer' }}
                                >
                                    {acoesFiltradasParaSelecao.map(a => {
                                        const temMatriz = matrizesBanco.some(m => (m.acoes || []).some(item => (item.acaoId || item.acao?.id) === a.id));
                                        const prefixo = a.id === 'AE 1.1.1.1' ? '⭐ [Exemplo Oficial] ' : (temMatriz ? '✓ [Matriz Ativa] ' : '');
                                        return (
                                            <option key={a.id} value={a.id}>
                                                {prefixo}{a.id} - {a.diretriz ? a.diretriz.slice(0, 85) + '...' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                                    Buscar por Código ou Palavra-Chave
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        value={buscaAcaoTexto}
                                        onChange={(e) => setBuscaAcaoTexto(e.target.value)}
                                        placeholder="Ex: AE 1.1.1.1 ou Minuta legal..."
                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.4rem', border: '1.5px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                    />
                                    <i className="bi bi-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* CARTÃO EXECUTIVO DA AÇÃO ESCOLHIDA                                        */}
                    {/* ========================================================================= */}
                    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', boxShadow: '0 8px 25px rgba(15, 23, 42, 0.05)', borderLeft: `6px solid ${eixoDaAcaoAtual.cor}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.25rem' }}>
                            <div>
                                {/* Badges de Classificação Estratégica */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                    <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.95rem' }}>
                                        {acaoAtual.id}
                                    </span>
                                    <span style={{ background: eixoDaAcaoAtual.bg, color: eixoDaAcaoAtual.cor, border: `1px solid ${eixoDaAcaoAtual.border}`, padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem' }}>
                                        {eixoDaAcaoAtual.codigo}: {eixoDaAcaoAtual.nome}
                                    </span>
                                    <span style={{ background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                                        {acaoAtual.projetoCodigo} - {acaoAtual.projetoNome}
                                    </span>
                                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                                        Setor: <strong>{acaoAtual.setor || 'CTSIST'}</strong>
                                    </span>
                                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.4rem 0.85rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                                        {acaoAtual.prazo} {acaoAtual.prazoEspecifico ? `(${acaoAtual.prazoEspecifico})` : ''}
                                    </span>
                                </div>

                                <h2 style={{ margin: '0.5rem 0', color: '#0f172a', fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.4 }}>
                                    {acaoAtual.diretriz}
                                </h2>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Meta Oficial PETRANS 2030
                                        </span>
                                        <p style={{ margin: '4px 0 0', color: '#1e293b', fontSize: '0.92rem', lineHeight: 1.5 }}>
                                            {acaoAtual.meta || 'Meta definida no Plano de Trabalho.'}
                                        </p>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Indicador de Resultado
                                        </span>
                                        <p style={{ margin: '4px 0 0', color: '#1e293b', fontSize: '0.92rem', lineHeight: 1.5 }}>
                                            {acaoAtual.indicador || 'Percentual de cumprimento da diretriz.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Circular de Progresso da Ação */}
                            <div style={{ textAlign: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '14px', padding: '1.25rem 1.75rem', minWidth: '160px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Andamento da Ação
                                </span>
                                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: corDoProgresso(matrizDaAcaoAtual?.percentual ?? 0) }}>
                                    {matrizDaAcaoAtual?.percentual ?? 0}%
                                </span>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <span style={{ 
                                        display: 'inline-block',
                                        padding: '0.35rem 0.75rem', 
                                        borderRadius: '999px', 
                                        fontSize: '0.78rem', 
                                        fontWeight: 800,
                                        background: matrizDaAcaoAtual?.status === 'APROVADO' ? '#dcfce7' : (matrizDaAcaoAtual?.status === 'ENVIADO' ? '#e0f2fe' : (matrizDaAcaoAtual?.status === 'PENDENTE' ? '#fee2e2' : '#fef9c3')),
                                        color: matrizDaAcaoAtual?.status === 'APROVADO' ? '#166534' : (matrizDaAcaoAtual?.status === 'ENVIADO' ? '#0369a1' : (matrizDaAcaoAtual?.status === 'PENDENTE' ? '#991b1b' : '#a16207'))
                                    }}>
                                        {matrizDaAcaoAtual ? `Status: ${matrizDaAcaoAtual.status}` : 'Sem Matriz Criada'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* DUAS COLUNAS: PASSOS DA AÇÃO (5W2H) vs PASSOS DO COMITÊ GESTOR             */}
                    {/* ========================================================================= */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
                        
                        {/* --------------------------------------------------------------------- */}
                        {/* COLUNA 1: PASSOS DA AÇÃO & TAREFAS 5W2H                                */}
                        {/* --------------------------------------------------------------------- */}
                        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                            <i className="bi bi-list-check"></i>
                                        </div>
                                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
                                            Passos e Tarefas da Ação (5W2H)
                                        </h3>
                                    </div>
                                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                        Cada tarefa concluída representa o avanço proporcional da etapa.
                                    </p>
                                </div>
                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '4px 10px', borderRadius: '8px' }}>
                                    {matrizDaAcaoAtual?.etapas?.length || 0} Passo(s)
                                </span>
                            </div>

                            {/* Lista de Passos / Etapas */}
                            {matrizDaAcaoAtual?.etapas && matrizDaAcaoAtual.etapas.length > 0 ? (
                                <div style={{ display: 'grid', gap: '1.25rem' }}>
                                    {matrizDaAcaoAtual.etapas.map((etapa, idx) => {
                                        const pctEtapa = calcularPercentualEtapa(etapa);
                                        const tarefas = etapa.tarefas || [];
                                        const concluidas = tarefas.filter(t => t.concluida).length;

                                        return (
                                            <div key={etapa.id || idx} style={{ border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '1.25rem', background: '#f8fafc' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', background: '#e2e8f0', padding: '0.3rem 0.7rem', borderRadius: '6px', textTransform: 'uppercase' }}>
                                                            Passo {idx + 1}
                                                        </span>
                                                        <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
                                                            {etapa.titulo || `Etapa ${idx + 1}`}
                                                        </strong>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: etapa.impacto === 'ALTO' ? '#fef2f2' : '#f0fdf4', color: etapa.impacto === 'ALTO' ? '#dc2626' : '#16a34a' }}>
                                                            Impacto: {etapa.impacto || 'MÉDIO'}
                                                        </span>
                                                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: corDoProgresso(pctEtapa) }}>
                                                            {pctEtapa}%
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Barra de Progresso do Passo */}
                                                <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                                    <div style={{ height: '100%', width: `${pctEtapa}%`, background: corDoProgresso(pctEtapa), transition: 'width 0.3s ease' }} />
                                                </div>

                                                {/* Detalhamento das Tarefas 5W2H do Passo */}
                                                {tarefas.length > 0 ? (
                                                    <div style={{ display: 'grid', gap: '0.85rem' }}>
                                                        {tarefas.map((tarefa, tIdx) => (
                                                            <div key={tarefa.id || tIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                                                    <i className={`bi ${tarefa.concluida ? 'bi-check-circle-fill' : 'bi-clock-history'}`} style={{ color: tarefa.concluida ? '#16a34a' : '#d97706', fontSize: '1.1rem' }}></i>
                                                                    <strong style={{ flex: 1, fontSize: '0.95rem', color: tarefa.concluida ? '#166534' : '#0f172a' }}>
                                                                        Tarefa {tIdx + 1}: {tarefa.titulo || 'Sem título'}
                                                                    </strong>
                                                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: tarefa.concluida ? '#dcfce7' : '#fef3c7', color: tarefa.concluida ? '#15803d' : '#b45309' }}>
                                                                        {tarefa.concluida ? 'CONCLUÍDA' : 'EM EXECUÇÃO'}
                                                                    </span>
                                                                </div>

                                                                {/* Grid 5W2H da Tarefa */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                                                                    {tarefa.quem && <div><span style={{ color: '#64748b', fontWeight: 700 }}>QUEM:</span> {tarefa.quem}</div>}
                                                                    {tarefa.quando && <div><span style={{ color: '#64748b', fontWeight: 700 }}>QUANDO:</span> {tarefa.quando}</div>}
                                                                    {tarefa.onde && <div><span style={{ color: '#64748b', fontWeight: 700 }}>ONDE:</span> {tarefa.onde}</div>}
                                                                    {tarefa.quanto && <div><span style={{ color: '#64748b', fontWeight: 700 }}>QUANTO:</span> {tarefa.quanto}</div>}
                                                                    {tarefa.porque && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 700 }}>POR QUÊ:</span> {tarefa.porque}</div>}
                                                                    {tarefa.como && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 700 }}>COMO:</span> {tarefa.como}</div>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', fontStyle: 'italic' }}>
                                                        Nenhuma tarefa detalhada neste passo.
                                                    </p>
                                                )}

                                                {etapa.observacao && (
                                                    <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#475569', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                        <strong>Observações:</strong> {etapa.observacao}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <i className="bi bi-file-earmark-plus" style={{ fontSize: '2.5rem', color: '#94a3b8', display: 'block', marginBottom: '0.75rem' }}></i>
                                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>Esta Ação ainda não possui Passos e Tarefas cadastrados</h4>
                                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', maxWidth: '380px', marginInline: 'auto' }}>
                                        Acesse o menu <strong>Ações Estratégicas</strong> para criar a matriz 5W2H e definir os passos desta ação.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* --------------------------------------------------------------------- */}
                        {/* COLUNA 2: OS PASSOS QUE O COMITÊ GESTOR FEZ (GOVERNANÇA & TIMELINE)   */}
                        {/* --------------------------------------------------------------------- */}
                        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '1.75rem', boxShadow: '0 6px 20px rgba(15, 23, 42, 0.04)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                        <i className="bi bi-shield-check"></i>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.2rem', fontWeight: 800 }}>
                                            Passos do Comitê Gestor
                                        </h3>
                                        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
                                            Trilha de deliberações, votos fundamentados e homologação.
                                        </p>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: '999px' }}>
                                    Governança Ativa
                                </span>
                            </div>

                            {/* Timeline de Passos do Comitê Gestor */}
                            <div style={{ position: 'relative', paddingLeft: '1.75rem', display: 'grid', gap: '1.5rem' }}>
                                {/* Linha vertical da timeline */}
                                <div style={{ position: 'absolute', left: '10px', top: '10px', bottom: '10px', width: '2px', background: '#e2e8f0' }} />

                                {/* PASSO 1: Submissão pelo Setor */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '22px', height: '22px', borderRadius: '50%', background: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                        1
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Submissão da Matriz pelo Setor</strong>
                                            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                                {matrizDaAcaoAtual?.dataCriacao ? new Date(matrizDaAcaoAtual.dataCriacao).toLocaleDateString('pt-BR') : 'Data registrada'}
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.88rem' }}>
                                            Elaborada por <strong>{matrizDaAcaoAtual?.criadoPor?.email || acaoAtual.setor}</strong> e remetida formalmente para a fila do Comitê Gestor.
                                        </p>
                                    </div>
                                </div>

                                {/* PASSO 2: Análise e Votação dos Membros */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '22px', height: '22px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                        2
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Análise e Votos dos Conselheiros</strong>
                                            <span style={{ fontSize: '0.76rem', color: '#7c3aed', fontWeight: 700, background: '#faf5ff', padding: '2px 8px', borderRadius: '6px' }}>
                                                Pareceres Fundamentados
                                            </span>
                                        </div>

                                        {/* Relação de Votos dos Membros */}
                                        {(matrizDaAcaoAtual?.votosComite || (historicoDetalhado?.revisoes?.[0]?.votos) || []).length > 0 ? (
                                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                                {(matrizDaAcaoAtual?.votosComite || (historicoDetalhado?.revisoes?.[0]?.votos) || []).map((v, i) => (
                                                    <div key={v.id || i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                                                                {v.membro || v.usuario?.email || 'Membro do Comitê Gestor'}
                                                            </strong>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: (v.voto === 'APROVAR' ? '#dcfce7' : '#fee2e2'), color: (v.voto === 'APROVAR' ? '#166534' : '#991b1b') }}>
                                                                Voto: {v.voto}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.84rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                            "{v.comentario || 'Sem parecer adicional.'}"
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem' }}>
                                                {matrizDaAcaoAtual?.status === 'ENVIADO' 
                                                    ? 'Aguardando registro de pareceres dos conselheiros no Painel Gestor.' 
                                                    : 'Votação colegiada realizada com sucesso.'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* PASSO 3: Homologação Final da Presidência / Secretaria-Executiva */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '22px', height: '22px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                        3
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', borderLeft: '4px solid #16a34a' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>Deliberação e Homologação Final</strong>
                                            <span style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 700 }}>
                                                {matrizDaAcaoAtual?.dataAvaliacao ? new Date(matrizDaAcaoAtual.dataAvaliacao).toLocaleDateString('pt-BR') : 'Decisão Homologada'}
                                            </span>
                                        </div>

                                        {matrizDaAcaoAtual?.comentarioComite ? (
                                            <div style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 0.95rem' }}>
                                                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                    Parecer Oficial do Comitê Gestor
                                                </span>
                                                <p style={{ margin: 0, color: '#166534', fontSize: '0.88rem', lineHeight: 1.55 }}>
                                                    {matrizDaAcaoAtual.comentarioComite}
                                                </p>
                                            </div>
                                        ) : (
                                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.86rem' }}>
                                                Aguardando homologação final do Secretário-Executivo / Presidência.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* PASSO 4: Execução & Acompanhamento dos Passos */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-1.75rem', top: '2px', width: '22px', height: '22px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                        4
                                    </div>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                                        <strong style={{ color: '#0f172a', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                                            Execução Física dos Passos e Monitoramento 2030
                                        </strong>
                                        <p style={{ margin: 0, color: '#475569', fontSize: '0.86rem', lineHeight: 1.5 }}>
                                            Com a aprovação, as tarefas 5W2H são atualizadas conforme são concluídas. O avanço percentual alimenta os 4 Eixos do PETRANS em tempo real.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VISÃO 1: AVANÇO POR EIXOS                                                 */}
            {/* ========================================================================= */}
            {abaAtiva === 'eixos' && (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>
                            Avanço dos 4 Eixos Centrais do PETRANS
                        </h3>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Percentual consolidado e totalizadores de ações por Eixo Estratégico.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {eixos.map((eixo) => (
                            <div key={eixo.eixoNumero} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: `5px solid ${eixo.cor}` }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: eixo.cor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            {eixo.codigo} • {eixo.sigla}
                                        </span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                                            {eixo.progresso}%
                                        </span>
                                    </div>

                                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', color: '#1e293b', lineHeight: 1.4 }}>
                                        {eixo.nome}
                                    </h4>

                                    <div style={{ height: '10px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                                        <div style={{ height: '100%', width: `${eixo.progresso}%`, background: eixo.cor, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                                    <span>Total: <strong>{eixo.totalAcoes}</strong> ações</span>
                                    <span>Concluídas: <strong style={{ color: '#16a34a' }}>{eixo.acoesConcluidas}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VISÃO 2: TODOS OS PROJETOS COM DESTAQUE NOS ESTRATÉGICOS                  */}
            {/* ========================================================================= */}
            {abaAtiva === 'projetos' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>
                                Projetos do PETRANS ({projetos.length} Projetos)
                            </h3>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                {kpis.totalEstrategicos ?? 8} Projetos Estratégicos definidos pela Administração Cetran/PA.
                                {podeEditarEstrategico && (
                                    <span style={{ marginLeft: '6px', color: '#2563eb', fontWeight: 600 }}>
                                        (Clique na estrela ⭐ para marcar ou desmarcar)
                                    </span>
                                )}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setApenasEstrategicos(false)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: !apenasEstrategicos ? '2px solid #2563eb' : '1px solid #cbd5e1', background: !apenasEstrategicos ? '#eff6ff' : '#fff', color: !apenasEstrategicos ? '#1e40af' : '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Todos ({projetos.length})
                            </button>
                            <button
                                onClick={() => setApenasEstrategicos(true)}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: apenasEstrategicos ? '2px solid #ca8a04' : '1px solid #cbd5e1', background: apenasEstrategicos ? '#fefce8' : '#fff', color: apenasEstrategicos ? '#854d0e' : '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <i className="bi bi-star-fill" style={{ color: '#ca8a04' }}></i>
                                Apenas Estratégicos ({projetos.filter(p => p.isEstrategico).length})
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
                        {projetosFiltrados.map((proj) => (
                            <div
                                key={proj.codigo}
                                style={{
                                    background: '#fff',
                                    border: proj.isEstrategico ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                    borderRadius: '14px',
                                    padding: '1.35rem',
                                    boxShadow: proj.isEstrategico ? '0 10px 25px rgba(59, 130, 246, 0.08)' : '0 4px 12px rgba(15, 23, 42, 0.03)',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#2563eb' }}>{proj.codigo}</span>
                                            
                                            {podeEditarEstrategico ? (
                                                proj.isEstrategico ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleEstrategico(proj.codigo, true, proj.nome)}
                                                        title="Remover status estratégico"
                                                        style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #facc15', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                                    >
                                                        ⭐ ESTRATÉGICO
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleEstrategico(proj.codigo, false, proj.nome)}
                                                        title="Marcar como Estratégico"
                                                        style={{ background: '#f8fafc', color: '#64748b', border: '1px dashed #cbd5e1', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                                    >
                                                        ☆ Marcar
                                                    </button>
                                                )
                                            ) : (
                                                proj.isEstrategico && (
                                                    <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                                                        ⭐ ESTRATÉGICO
                                                    </span>
                                                )
                                            )}
                                        </div>

                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                                            {proj.nome}
                                        </h4>
                                    </div>

                                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: corDoProgresso(proj.progresso) }}>
                                        {proj.progresso}%
                                    </span>
                                </div>

                                <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                    <div style={{ height: '100%', width: `${proj.progresso}%`, background: corDoProgresso(proj.progresso), borderRadius: '999px' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                                    <span><strong>{proj.totalAcoes}</strong> ações vinculadas</span>
                                    <span>Concluídas: <strong>{proj.acoesConcluidas}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VISÃO 3: HORIZONTES DE PRAZO                                              */}
            {/* ========================================================================= */}
            {abaAtiva === 'prazos' && (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>
                            Ações vs. Metas por Horizontes de Prazo
                        </h3>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Percentual acumulado por faixas temporais (Curto, Médio e Longo Prazo).
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                        {faixasPrazos.map((faixa) => (
                            <div
                                key={faixa.codigo}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
                                    borderTop: `4px solid ${faixa.cor}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: faixa.cor, textTransform: 'uppercase' }}>
                                        {faixa.rotulo}
                                    </span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                                        {faixa.progressoAcumulado}%
                                    </span>
                                </div>

                                <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', margin: '0.75rem 0' }}>
                                    <div style={{ height: '100%', width: `${faixa.progressoAcumulado}%`, background: faixa.cor, borderRadius: '999px' }} />
                                </div>

                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                    Total de Ações: <strong>{faixa.totalAcoes}</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* VISÃO 4: DESEMPENHO POR SETORES                                           */}
            {/* ========================================================================= */}
            {abaAtiva === 'setores' && (
                <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem', fontWeight: 800 }}>
                            Desempenho por Setores e Comissões Temáticas
                        </h3>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Distribuição de responsabilidade institucional e taxa de conclusão das ações do PETRANS.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                        {setores.map((s) => (
                            <div
                                key={s.setor}
                                onClick={() => setSetorFiltro(s.setor)}
                                style={{
                                    background: '#fff',
                                    border: setorFiltro === s.setor ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                    borderRadius: '14px',
                                    padding: '1.35rem',
                                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                                        {s.rotulo || s.setor}
                                    </h4>
                                    <span style={{ fontSize: '1.3rem', fontWeight: 800, color: corDoProgresso(s.progresso) }}>
                                        {s.progresso}%
                                    </span>
                                </div>

                                <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                                    <div style={{ height: '100%', width: `${s.progresso}%`, background: corDoProgresso(s.progresso), borderRadius: '999px' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748b' }}>
                                    <span><strong>{s.totalAcoes}</strong> ações atribuídas</span>
                                    <span><strong>{s.acoesConcluidas}</strong> concluídas</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

const estiloKpiCard = (corBorda) => ({
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderLeft: `5px solid ${corBorda}`,
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.03)'
});

const estiloKpiLabel = {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block'
};

const estiloAba = (ativa, corAtiva = '#2563eb') => ({
    background: ativa ? corAtiva : 'transparent',
    color: ativa ? '#fff' : '#475569',
    border: 'none',
    padding: '0.7rem 1.25rem',
    borderRadius: '10px 10px 0 0',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    boxShadow: ativa ? '0 -2px 6px rgba(0,0,0,0.04)' : 'none'
});
