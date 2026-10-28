// src/pages/DashboardEstrategico.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ArrowClockwise,
    Buildings,
    CaretDown,
    ChartLineUp,
    CheckCircle,
    ClockCounterClockwise,
    FileCsv,
    FileXls,
    Funnel,
    Hourglass,
    Stack,
    ListChecks,
    MagnifyingGlass,
    ShieldCheck,
    Star,
    TreeStructure
} from '@phosphor-icons/react';
import {
    buscarResumoAnalytics,
    buscarObjetivos,
    buscarPrazos,
    alternarProjetoEstrategico
} from '../services/analytics';
import { listarMatrizes, buscarHistoricoMatriz } from '../services/matrizes';
import { listarAcoes } from '../services/acoes';
import { acoesEstrategicas } from '../services/acoes_data';
import { exportarMatrizesAprovadasCSV, exportarMatrizesAprovadasExcel } from '../services/exportService';
import { ehAdmin } from '../services/permissoes';
import { RadarLoader } from '../components/RadarLoader';
import '../styles/dashboard.css';
import { 
    SETORES_RADAR, 
    calcularPercentualEtapas, 
    calcularPercentualEtapa,
    contarTarefas,
    normalizarSetor,
    obterPercentuaisPorAcao,
    formatarValorReal
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

function SecaoAcordeao({ id, icone: Icone, titulo, descricao, abertaInicialmente = false, children }) {
    const [aberta, setAberta] = useState(abertaInicialmente);
    const [focada, setFocada] = useState(false);
    const painelId = `${id}-painel`;

    return (
        <section style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '14px', overflow: 'hidden' }}>
            <button
                type="button"
                aria-expanded={aberta}
                aria-controls={painelId}
                onClick={() => setAberta(valor => !valor)}
                onFocus={() => setFocada(true)}
                onBlur={() => setFocada(false)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    padding: '1rem 1.25rem',
                    border: 0,
                    background: '#fff',
                    textAlign: 'left',
                    cursor: 'pointer',
                    outline: focada ? '3px solid #2563eb' : 'none',
                    outlineOffset: '-3px'
                }}
            >
                <Icone size={22} weight="regular" style={{ flex: '0 0 auto', color: '#0b4383' }} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.05rem', lineHeight: 1.4 }}>{titulo}</strong>
                    <span style={{ display: 'block', marginTop: '2px', color: '#475569', fontSize: '0.875rem', lineHeight: 1.45 }}>{descricao}</span>
                </span>
                <CaretDown
                    size={20}
                    weight="bold"
                    style={{ flex: '0 0 auto', color: '#334155', transform: aberta ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                    aria-hidden="true"
                />
            </button>
            <div id={painelId} hidden={!aberta} style={{ padding: aberta ? '0 1.25rem 1.25rem' : 0 }}>
                {aberta && children}
            </div>
        </section>
    );
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
    const [projetoFiltro, setProjetoFiltro] = useState('');
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
    const [acoesDashboard, setAcoesDashboard] = useState(acoesEstrategicas);
    const [dadosResumo, setDadosResumo] = useState(null);
    const [dadosObjetivos, setDadosObjetivos] = useState(null);
    const [dadosPrazosDetalhados, setDadosPrazosDetalhados] = useState(null);

    const [carregando, setCarregando] = useState(true);
    const podeEditarEstrategico = ehAdmin(usuarioLogado);
    const podeExportar = podeEditarEstrategico;

    const handleExportarCSV = () => {
        if (!podeExportar) return;

        const resultado = exportarMatrizesAprovadasCSV(matrizesBanco);
        if (resultado.sucesso) {
            Swal.fire({
                icon: 'success',
                title: 'CSV gerado com sucesso!',
                text: `${resultado.quantidade} registro(s) exportado(s) para CSV.`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({ icon: 'info', title: 'Nada para exportar', text: resultado.mensagem, confirmButtonColor: '#2563eb' });
        }
    };

    const handleExportarExcel = () => {
        if (!podeExportar) return;

        const resultado = exportarMatrizesAprovadasExcel(matrizesBanco);
        if (resultado.sucesso) {
            Swal.fire({
                icon: 'success',
                title: 'Excel gerado com sucesso!',
                text: `${resultado.quantidade} registro(s) exportado(s) para .xlsx.`,
                timer: 2000,
                showConfirmButton: false
            });
        } else {
            Swal.fire({ icon: 'info', title: 'Nada para exportar', text: resultado.mensagem, confirmButtonColor: '#2563eb' });
        }
    };

    useEffect(() => {
        let ativo = true;
        listarAcoes()
            .then(dados => {
                if (!ativo || !Array.isArray(dados) || dados.length === 0) return;
                setAcoesDashboard(dados.map(acao => ({
                    ...acao,
                    prazo: acao.prazo === 'CURTO_PRAZO'
                        ? 'Curto Prazo'
                        : acao.prazo === 'MEDIO_PRAZO'
                            ? 'Médio Prazo'
                            : acao.prazo === 'LONGO_PRAZO'
                                ? 'Longo Prazo'
                                : acao.prazo
                })));
            })
            .catch(() => {
                if (ativo) setAcoesDashboard(acoesEstrategicas);
            });
        return () => { ativo = false; };
    }, []);

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

    const acoesCompativeisComFiltrosBase = useMemo(() => acoesDashboard.filter(acao => {
        const matchEixo = !filtroEixoAcao || identificarEixoDoProjeto(acao.projetoCodigo).id === Number(filtroEixoAcao);
        const matchSetor = !setorFiltro || normalizarSetor(acao.setor) === normalizarSetor(setorFiltro);
        return matchEixo && matchSetor;
    }), [acoesDashboard, filtroEixoAcao, setorFiltro]);

    const projetosDisponiveis = useMemo(() => {
        const unicos = new Map();
        acoesCompativeisComFiltrosBase.forEach(acao => {
            if (acao.projetoCodigo && !unicos.has(acao.projetoCodigo)) {
                unicos.set(acao.projetoCodigo, {
                    codigo: acao.projetoCodigo,
                    nome: acao.projetoNome || acao.projetoCodigo
                });
            }
        });
        return [...unicos.values()].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR'));
    }, [acoesCompativeisComFiltrosBase]);

    const acoesFiltradasParaSelecao = useMemo(() => acoesCompativeisComFiltrosBase.filter(acao => {
        const matchProjeto = !projetoFiltro || acao.projetoCodigo === projetoFiltro;
        const termoBusca = buscaAcaoTexto.trim().toLocaleLowerCase('pt-BR');
        const matchTexto = !termoBusca
            || acao.id.toLocaleLowerCase('pt-BR').includes(termoBusca)
            || (acao.diretriz || '').toLocaleLowerCase('pt-BR').includes(termoBusca)
            || (acao.projetoNome || '').toLocaleLowerCase('pt-BR').includes(termoBusca);
        return matchProjeto && matchTexto;
    }), [acoesCompativeisComFiltrosBase, projetoFiltro, buscaAcaoTexto]);

    // Mantém a ação em foco alinhada à lista visível após qualquer combinação de filtros.
    useEffect(() => {
        if (!acoesFiltradasParaSelecao.some(acao => acao.id === acaoIdSelecionada)) {
            setAcaoIdSelecionada(acoesFiltradasParaSelecao[0]?.id || '');
        }
    }, [acoesFiltradasParaSelecao, acaoIdSelecionada]);

    useEffect(() => {
        if (projetoFiltro && !projetosDisponiveis.some(projeto => projeto.codigo === projetoFiltro)) {
            setProjetoFiltro('');
        }
    }, [projetosDisponiveis, projetoFiltro]);

    // Localiza a Ação Estratégica Selecionada
    const acaoAtual = useMemo(
        () => acoesDashboard.find(acao => acao.id === acaoIdSelecionada) || null,
        [acoesDashboard, acaoIdSelecionada]
    );

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

        const totalAcoes = acoesDashboard.length;
        const acoesComProgresso = Object.values(percentuais);
        const acoesConcluidas = acoesComProgresso.filter(p => p === 100).length;
        const acoesEmAndamento = acoesComProgresso.filter(p => p > 0 && p < 100).length;
        const somaProgresso = acoesDashboard.reduce((acc, a) => acc + (percentuais[a.id] || 0), 0);
        const progressoGlobal = Math.round(somaProgresso / (totalAcoes || 1));

        // 1. Eixos Consolidados
        const eixosConsolidados = Object.values(EIXOS_INFO).map(eixo => {
            const acoesDoEixo = acoesDashboard.filter(a => identificarEixoDoProjeto(a.projetoCodigo).id === eixo.id);
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
        acoesDashboard.forEach(a => {
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
        acoesDashboard.forEach(a => {
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
        acoesDashboard.forEach(a => {
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
    }, [matrizesBanco, acoesDashboard]);

    const kpis = dadosResumo?.kpis || metricasConsolidadas.kpis;
    const eixos = dadosResumo?.visao1_eixos || metricasConsolidadas.eixos;
    const projetos = dadosResumo?.visao2_projetos || metricasConsolidadas.projetos;
    const faixasPrazos = dadosResumo?.visao4_prazos || metricasConsolidadas.faixasPrazos;
    const setores = dadosResumo?.visao5_setores || metricasConsolidadas.setores;
    const percentuaisMetaGlobal = useMemo(
        () => obterPercentuaisPorAcao(matrizesBanco),
        [matrizesBanco]
    );
    const progressoMetaGlobal = useMemo(() => {
        const valores = acoesEstrategicas.map(acao => percentuaisMetaGlobal[acao.id] ?? 0);
        return valores.length
            ? Math.round(valores.reduce((soma, valor) => soma + valor, 0) / valores.length)
            : 0;
    }, [percentuaisMetaGlobal]);
    const acoesComMatrizAprovada = acoesEstrategicas.filter(
        acao => percentuaisMetaGlobal[acao.id] !== undefined
    ).length;
    const totalMatrizesAprovadas = useMemo(
        () => matrizesBanco.filter(matriz => matriz.status === 'APROVADO').length,
        [matrizesBanco]
    );

    const projetosFiltrados = apenasEstrategicos 
        ? projetos.filter(p => p.isEstrategico)
        : projetos;
    const matrizFocoDisponivel = ['APROVADO', 'ENVIADO'].includes(matrizDaAcaoAtual?.status)
        ? matrizDaAcaoAtual
        : null;
    const etapasDaAcaoFoco = matrizFocoDisponivel?.etapas || [];
    const tarefasDaAcaoFoco = contarTarefas(etapasDaAcaoFoco);
    const passosConcluidos = etapasDaAcaoFoco.filter(etapa => calcularPercentualEtapa(etapa) === 100).length;
    const votosComiteAcao = matrizDaAcaoAtual?.votosComite?.length
        ? matrizDaAcaoAtual.votosComite
        : historicoDetalhado?.revisoes?.[0]?.votos || [];
    const parecerFinalComite = matrizDaAcaoAtual?.comentarioComite || '';
    const eixoDaAcaoAtual = identificarEixoDoProjeto(acaoAtual?.projetoCodigo);
    const projetoDaAcaoAtual = projetos.find(projeto => projeto.codigo === acaoAtual?.projetoCodigo);
    const eixoMetricasAcaoAtual = eixos.find(eixo => Number(eixo.eixoNumero) === eixoDaAcaoAtual.id);
    const setorMetricasAcaoAtual = setores.find(setor => normalizarSetor(setor.setor) === normalizarSetor(acaoAtual?.setor));
    const percentualAcaoFoco = matrizFocoDisponivel?.percentual ?? 0;
    const statusAcaoFoco = percentualAcaoFoco === 100
        ? { rotulo: 'Concluída', fundo: '#dcfce7', cor: '#166534' }
        : percentualAcaoFoco > 0
            ? { rotulo: 'Em andamento', fundo: '#ffedd5', cor: '#9a3412' }
            : matrizFocoDisponivel?.status === 'ENVIADO'
                ? { rotulo: 'Em análise', fundo: '#dbeafe', cor: '#1e40af' }
                : { rotulo: 'Sem progresso', fundo: '#f1f5f9', cor: '#334155' };

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
            confirmButtonColor: novoStatus ? '#0b4383' : '#ed1c24',
            cancelButtonColor: '#0b4383',
            confirmButtonText: novoStatus ? 'Sim, marcar ⭐' : 'Sim, remover',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await alternarProjetoEstrategico(projetoCodigo, novoStatus, usuarioLogado?.email);
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

    if (carregando) {
        return (
            <div style={{ padding: '6rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
                <RadarLoader
                    tamanho="lg"
                    mensagem="Carregando Dashboard Estratégico..."
                    submensagem="Consolidando indicadores, visões em cascata e metas do PETRANS"
                />
            </div>
        );
    }

    return (
        <div className="dashboard-shell">
        <div className="dashboard-content" style={{ fontFamily: 'Inter, sans-serif' }}>
            
            {/* Header Executivo & Lente de Setor */}
            <div className="dashboard-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '2rem' }}>
                <div>
                    <div className="dashboard-heading-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                <div className="dashboard-heading-actions">
                    {podeExportar && (
                        <div className="dashboard-export-actions" role="group" aria-label="Exportar matrizes aprovadas">
                            <button
                                type="button"
                                className="button painel-export-button painel-export-csv"
                                onClick={handleExportarCSV}
                                disabled={matrizesBanco.length === 0}
                                aria-label="Exportar matrizes aprovadas em arquivo CSV"
                            >
                                <FileCsv size={18} weight="bold" aria-hidden="true" />
                                Exportar CSV
                            </button>
                            <button
                                type="button"
                                className="button painel-export-button painel-export-excel"
                                onClick={handleExportarExcel}
                                disabled={matrizesBanco.length === 0}
                                aria-label="Exportar matrizes aprovadas em arquivo Excel"
                            >
                                <FileXls size={18} weight="bold" aria-hidden="true" />
                                Exportar Excel
                            </button>
                        </div>
                    )}

                {/* Filtro Lente de Setor */}
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem 1.15rem', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)', display: abaAtiva === 'foco' ? 'none' : 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155', fontWeight: 600, fontSize: '0.88rem' }}>
                        <Funnel size={16} weight="bold" style={{ color: '#2563eb' }} aria-hidden="true" />
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
                    className="dashboard-button-primary"
                    type="button"
                        onClick={carregarDados}
                        title="Atualizar dados"
                        aria-label="Atualizar dados"
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                        <ArrowClockwise size={18} weight="bold" className={carregando ? 'spin' : undefined} aria-hidden="true" />
                    </button>
                </div>
                </div>
            </div>

            {/* Cards de KPIs Principais no Topo */}
            <div className="dashboard-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={estiloKpiCard()}>
                    <span style={estiloKpiLabel}>Progresso Geral do Plano</span>
                    <h2 style={estiloKpiNumero}>
                        {kpis.progressoGlobal ?? 0}%
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Média consolidada em cascata</span>
                </div>

                <div style={estiloKpiCard()}>
                    <span style={estiloKpiLabel}>Ações Concluídas (100%)</span>
                    <h2 style={estiloKpiNumero}>
                        {kpis.acoesConcluidas ?? 0}
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>De {kpis.totalAcoes ?? 0} ações totais</span>
                </div>

                <div style={estiloKpiCard()}>
                    <span style={estiloKpiLabel}>Ações em Andamento</span>
                    <h2 style={estiloKpiNumero}>
                        {kpis.acoesEmAndamento ?? 0}
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Etapas em execução física</span>
                </div>

                <div style={estiloKpiCard()}>
                    <span style={estiloKpiLabel}>{kpis.totalEstrategicos ?? 8} Projetos Estratégicos</span>
                    <h2 style={estiloKpiNumero}>
                        {kpis.progressoMedioEstrategicos ?? 0}%
                    </h2>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Avanço médio prioritário</span>
                </div>
            </div>

            {/* Barra de Navegação das Abas do Dashboard */}
            <nav className="dashboard-tabs" aria-label="Visões estratégicas do dashboard">
                <button
                    type="button"
                    onClick={() => setAbaAtiva('foco')}
                    aria-pressed={abaAtiva === 'foco'}
                    className="dashboard-tab"
                    style={estiloAba(abaAtiva === 'foco')}
                >
                    <Stack size={18} weight={abaAtiva === 'foco' ? 'fill' : 'bold'} aria-hidden="true" />
                    <span>Ação em Foco & Comitê Gestor</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaAtiva('meta')}
                    aria-pressed={abaAtiva === 'meta'}
                    className="dashboard-tab"
                    style={estiloAba(abaAtiva === 'meta')}
                >
                    <ChartLineUp size={18} weight={abaAtiva === 'meta' ? 'fill' : 'bold'} aria-hidden="true" />
                    <span>Meta Global PETRANS</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaAtiva('eixos')}
                    aria-pressed={abaAtiva === 'eixos'}
                    className="dashboard-tab"
                    style={estiloAba(abaAtiva === 'eixos')}
                >
                    <TreeStructure size={18} weight={abaAtiva === 'eixos' ? 'fill' : 'bold'} aria-hidden="true" />
                    <span>1. Avanço por Eixos ({eixos.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaAtiva('projetos')}
                    aria-pressed={abaAtiva === 'projetos'}
                    className="dashboard-tab"
                    style={estiloAba(abaAtiva === 'projetos')}
                >
                    <Star size={18} weight={abaAtiva === 'projetos' ? 'fill' : 'bold'} aria-hidden="true" />
                    <span>2. Todos os Projetos ({projetos.length})</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaAtiva('prazos')}
                    aria-pressed={abaAtiva === 'prazos'}
                    className="dashboard-tab"
                    style={estiloAba(abaAtiva === 'prazos')}
                >
                    <Hourglass size={18} weight={abaAtiva === 'prazos' ? 'fill' : 'bold'} aria-hidden="true" />
                    <span>3. Horizontes de Prazo</span>
                </button>

                <button
                    type="button"
                    onClick={() => setAbaAtiva('setores')}
                    aria-pressed={abaAtiva === 'setores'}
                    className="dashboard-tab"
                    style={estiloAba(abaAtiva === 'setores')}
                >
                    <Buildings size={18} weight={abaAtiva === 'setores' ? 'fill' : 'bold'} aria-hidden="true" />
                    <span>4. Desempenho por Setores</span>
                </button>
            </nav>

            {/* ========================================================================= */}
            {/* ABA CENTRAL: AÇÃO EM FOCO, DETALHAMENTO 5W2H E PASSOS DO COMITÊ GESTOR   */}
            {/* ========================================================================= */}
            {abaAtiva === 'meta' && (
                <section aria-labelledby="meta-global-titulo" style={{ display: 'grid', gap: '1.25rem' }}>
                    <div>
                        <h2 id="meta-global-titulo" style={{ margin: 0, color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>
                            Meta Global PETRANS 2030
                        </h2>
                        <p style={{ margin: '0.4rem 0 0', color: '#64748b', fontSize: '0.92rem', lineHeight: 1.6 }}>
                            Acompanhamento consolidado do progresso das ações, considerando apenas etapas de matrizes aprovadas pelo Comitê Gestor.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.04)', display: 'grid', justifyItems: 'center', alignContent: 'center', gap: '1rem' }}>
                            <div
                                role="img"
                                aria-label={`Progresso global do PETRANS: ${progressoMetaGlobal}%`}
                                style={{
                                    width: 'min(58vw, 230px)',
                                    aspectRatio: '1',
                                    borderRadius: '50%',
                                    background: `conic-gradient(#2563eb ${progressoMetaGlobal}%, #e2e8f0 ${progressoMetaGlobal}% 100%)`,
                                    display: 'grid',
                                    placeItems: 'center'
                                }}
                            >
                                <div aria-hidden="true" style={{ width: '76%', aspectRatio: '1', borderRadius: '50%', background: '#fff', display: 'grid', placeContent: 'center', textAlign: 'center' }}>
                                    <strong style={{ color: '#0f172a', fontSize: '2.5rem', lineHeight: 1 }}>{progressoMetaGlobal}%</strong>
                                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>CONCLUÍDO</span>
                                </div>
                            </div>
                            <p style={{ margin: 0, textAlign: 'center', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.55 }}>
                                Média de progresso das ações oficiais do PETRANS, com ações sem matriz aprovada contabilizadas como 0%.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gap: '1rem', alignContent: 'start' }}>
                            <div style={estiloKpiCard('#2563eb')}>
                                <span style={estiloKpiLabel}>Ações oficiais do plano</span>
                                <strong style={{ display: 'block', marginTop: '0.3rem', color: '#0f172a', fontSize: '2rem' }}>{acoesEstrategicas.length}</strong>
                            </div>
                            <div style={estiloKpiCard('#16a34a')}>
                                <span style={estiloKpiLabel}>Ações com matriz aprovada</span>
                                <strong style={{ display: 'block', marginTop: '0.3rem', color: '#166534', fontSize: '2rem' }}>{acoesComMatrizAprovada}</strong>
                            </div>
                            <div style={estiloKpiCard('#7c3aed')}>
                                <span style={estiloKpiLabel}>Matrizes aprovadas pelo Comitê</span>
                                <strong style={{ display: 'block', marginTop: '0.3rem', color: '#6d28d9', fontSize: '2rem' }}>{totalMatrizesAprovadas}</strong>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {abaAtiva === 'foco' && (
                <div style={{ display: 'grid', gap: '1.25rem', minWidth: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '0.85rem', padding: '1rem', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '14px', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)' }}>
                        <div>
                            <label htmlFor="filtro-eixo-acao" style={estiloRotuloFiltro}>Eixo</label>
                            <select id="filtro-eixo-acao" value={filtroEixoAcao} onChange={event => { setFiltroEixoAcao(event.target.value); setProjetoFiltro(''); }} style={estiloCampoFiltro}>
                                <option value="">Todos os Eixos</option>
                                {Object.values(EIXOS_INFO).map(eixo => <option key={eixo.id} value={String(eixo.id)}>{eixo.codigo}: {eixo.nome}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="filtro-setor-acao" style={estiloRotuloFiltro}>Setor</label>
                            <select id="filtro-setor-acao" value={setorFiltro} onChange={event => { setSetorFiltro(event.target.value); setProjetoFiltro(''); }} style={estiloCampoFiltro}>
                                {SETORES_OPCOES.map(opcao => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="filtro-projeto-acao" style={estiloRotuloFiltro}>Projeto</label>
                            <select id="filtro-projeto-acao" value={projetoFiltro} onChange={event => setProjetoFiltro(event.target.value)} style={estiloCampoFiltro}>
                                <option value="">Todos os Projetos</option>
                                {projetosDisponiveis.map(projeto => <option key={projeto.codigo} value={projeto.codigo}>{projeto.codigo} - {projeto.nome}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="filtro-acao-estrategica" style={estiloRotuloFiltro}>
                                Ação <span style={{ color: '#475569', fontWeight: 500 }}>({acoesFiltradasParaSelecao.length} ações)</span>
                            </label>
                            <select
                                id="filtro-acao-estrategica"
                                value={acaoIdSelecionada}
                                onChange={event => setAcaoIdSelecionada(event.target.value)}
                                disabled={!acoesFiltradasParaSelecao.length}
                                style={estiloCampoFiltro}
                            >
                                {acoesFiltradasParaSelecao.map(acao => {
                                    const temMatriz = matrizesBanco.some(matriz => (matriz.acoes || []).some(item => (item.acaoId || item.acao?.id) === acao.id));
                                    const prefixo = acao.id === 'AE 1.1.1.1' ? '⭐ [Exemplo Oficial] ' : (temMatriz ? '✓ [Matriz Ativa] ' : '');
                                    return <option key={acao.id} value={acao.id}>{prefixo}{acao.id} - {acao.diretriz || ''}</option>;
                                })}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="busca-acao-foco" style={estiloRotuloFiltro}>Busca por código ou palavra-chave</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="busca-acao-foco"
                                    type="search"
                                    value={buscaAcaoTexto}
                                    onChange={event => setBuscaAcaoTexto(event.target.value)}
                                    placeholder="Código ou palavra-chave"
                                    style={{ ...estiloCampoFiltro, paddingLeft: '2.35rem' }}
                                />
                                <MagnifyingGlass size={18} weight="bold" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} aria-hidden="true" />
                            </div>
                        </div>
                    </div>

                    {!acaoAtual && (
                        <p role="status" style={{ margin: 0, padding: '1rem', color: '#334155', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem' }}>
                            Nenhuma ação corresponde aos filtros selecionados.
                        </p>
                    )}

                    {acaoAtual && (
                    <>

                    {/* ========================================================================= */}
                    {/* CARTÃO EXECUTIVO DA AÇÃO ESCOLHIDA                                        */}
                    {/* ========================================================================= */}
                    <section aria-label="Resumo da ação em foco" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 8px 22px rgba(15, 23, 42, 0.1)' }}>
                        <div style={{ padding: '1.25rem 1.5rem', background: '#dbeafe', color: '#0f172a' }}>
                            <h2 style={{ margin: '0 0 1rem', color: '#1e3a8a', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em' }}>ESTA AÇÃO</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <strong style={{ display: 'block', fontSize: '2.2rem', lineHeight: 1.15, color: corDoProgresso(percentualAcaoFoco) }}>{percentualAcaoFoco}%</strong>
                                    <span style={estiloRotuloResumo}>Andamento da ação</span>
                                    <span style={{ display: 'inline-block', marginTop: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: '999px', background: statusAcaoFoco.fundo, color: statusAcaoFoco.cor, fontSize: '0.75rem', fontWeight: 800 }}>{statusAcaoFoco.rotulo}</span>
                                </div>
                                <div>
                                    <strong style={estiloNumeroResumo}>{passosConcluidos} de {etapasDaAcaoFoco.length}</strong>
                                    <span style={estiloRotuloResumo}>Passos concluídos</span>
                                </div>
                                <div>
                                    <strong style={estiloNumeroResumo}>{tarefasDaAcaoFoco.concluidas} de {tarefasDaAcaoFoco.total}</strong>
                                    <span style={estiloRotuloResumo}>Tarefas concluídas</span>
                                </div>
                                {(acaoAtual.prazoEspecifico || acaoAtual.prazo) && (
                                    <div>
                                        <strong style={estiloNumeroResumo}>{acaoAtual.prazoEspecifico || acaoAtual.prazo}</strong>
                                        <span style={estiloRotuloResumo}>Prazo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem', background: '#1e40af', color: '#fff' }}>
                            <h2 style={{ margin: '0 0 1rem', color: '#fff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.1em' }}>CONTEXTO</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))', gap: '1rem' }}>
                                {projetoDaAcaoAtual && (
                                    <div>
                                        <strong style={estiloNumeroResumoContexto}>{projetoDaAcaoAtual.progresso}%</strong>
                                        <span style={estiloRotuloResumoContexto}>Avanço do projeto</span>
                                    </div>
                                )}
                                {eixoMetricasAcaoAtual && (
                                    <div>
                                        <strong style={estiloNumeroResumoContexto}>{eixoMetricasAcaoAtual.progresso}%</strong>
                                        <span style={estiloRotuloResumoContexto}>Avanço do eixo</span>
                                    </div>
                                )}
                                {setorMetricasAcaoAtual && (
                                    <div>
                                        <strong style={estiloNumeroResumoContexto}>{setorMetricasAcaoAtual.progresso}%</strong>
                                        <span style={estiloRotuloResumoContexto}>Avanço do setor</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    <section style={{ background: '#fff', border: '1px solid #cbd5e1', borderLeft: `5px solid ${eixoDaAcaoAtual.cor}`, borderRadius: '14px', padding: '1.25rem 1.5rem', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
                            <span style={estiloEtiquetaAcao('#eff6ff', '#1d4ed8')}>{acaoAtual.id}</span>
                            <span style={estiloEtiquetaAcao(eixoDaAcaoAtual.bg, eixoDaAcaoAtual.cor)}>{eixoDaAcaoAtual.codigo}: {eixoDaAcaoAtual.nome}</span>
                            {acaoAtual.projetoCodigo && <span style={estiloEtiquetaAcao('#f1f5f9', '#334155')}>{acaoAtual.projetoCodigo}{acaoAtual.projetoNome ? ` - ${acaoAtual.projetoNome}` : ''}</span>}
                            {acaoAtual.setor && <span style={estiloEtiquetaAcao('#f1f5f9', '#334155')}>Setor: {acaoAtual.setor}</span>}
                            {(acaoAtual.prazo || acaoAtual.prazoEspecifico) && <span style={estiloEtiquetaAcao('#f1f5f9', '#334155')}>{[acaoAtual.prazo, acaoAtual.prazoEspecifico].filter(Boolean).join(' ')}</span>}
                        </div>
                        <h2 style={{ margin: '0.25rem 0 0', color: '#0f172a', fontSize: 'clamp(1.2rem, 2vw, 1.55rem)', fontWeight: 800, lineHeight: 1.35 }}>
                            {acaoAtual.diretriz}
                        </h2>
                        {acaoAtual.descricao && <p style={{ margin: '0.45rem 0 0', color: '#475569', fontSize: '0.95rem', lineHeight: 1.55 }}>{acaoAtual.descricao}</p>}
                    </section>

                    {/* ========================================================================= */}
                    {/* DUAS COLUNAS: PASSOS DA AÇÃO (5W2H) vs PASSOS DO COMITÊ GESTOR             */}
                    {/* ========================================================================= */}
                    <div style={{ display: 'grid', gap: '1rem', minWidth: 0 }}>
                        
                        {/* --------------------------------------------------------------------- */}
                        {/* COLUNA 1: PASSOS DA AÇÃO & TAREFAS 5W2H                                */}
                        {/* --------------------------------------------------------------------- */}
                        <SecaoAcordeao
                            id="acao-foco-passos"
                            icone={ListChecks}
                            titulo="Passos e tarefas (5W2H)"
                            descricao="Etapas, progresso e tarefas planejadas para esta ação."
                            abertaInicialmente
                        >

                            {/* Lista de Passos / Etapas */}
                            {matrizFocoDisponivel?.etapas?.length > 0 ? (
                                <div style={{ display: 'grid', gap: '1.25rem' }}>
                                    {matrizFocoDisponivel.etapas.map((etapa, idx) => {
                                        const pctEtapa = calcularPercentualEtapa(etapa);
                                        const tarefas = etapa.tarefas || [];

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
                                                        {tarefas.map((tarefa, tIdx) => {
                                                            const impactoTarefa = tarefa.impacto || etapa.impacto || 'MEDIO';
                                                            const observacaoTarefa = tarefa.observacao || (tIdx === 0 ? etapa.observacao : '');
                                                            return (
                                                            <div key={tarefa.id || tIdx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                                                    {tarefa.concluida
                                                                        ? <CheckCircle size={18} weight="fill" style={{ color: '#16a34a' }} aria-hidden="true" />
                                                                        : <ClockCounterClockwise size={18} weight="bold" style={{ color: '#d97706' }} aria-hidden="true" />}
                                                                    <strong style={{ flex: 1, fontSize: '0.95rem', color: tarefa.concluida ? '#166534' : '#0f172a' }}>
                                                                        {tarefa.titulo || 'Tarefa sem descrição'}
                                                                    </strong>
                                                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', background: tarefa.concluida ? '#dcfce7' : '#fef3c7', color: tarefa.concluida ? '#15803d' : '#b45309' }}>
                                                                        {tarefa.concluida ? 'CONCLUÍDA' : 'EM EXECUÇÃO'}
                                                                    </span>
                                                                </div>
                                                                <span style={{ display: 'inline-block', marginBottom: '0.5rem', padding: '2px 8px', borderRadius: '6px', background: impactoTarefa === 'ALTO' ? '#fef2f2' : impactoTarefa === 'BAIXO' ? '#f1f5f9' : '#eff6ff', color: impactoTarefa === 'ALTO' ? '#b91c1c' : impactoTarefa === 'BAIXO' ? '#475569' : '#1d4ed8', fontSize: '0.75rem', fontWeight: 700 }}>
                                                                    Impacto da tarefa: {{ BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' }[impactoTarefa] || impactoTarefa}
                                                                </span>

                                                                {/* Grid 5W2H da Tarefa */}
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                                                    {tarefa.quem && <div><span style={{ color: '#64748b', fontWeight: 700 }}>QUEM:</span> {tarefa.quem}</div>}
                                                                    {tarefa.quando && <div><span style={{ color: '#64748b', fontWeight: 700 }}>QUANDO:</span> {tarefa.quando}</div>}
                                                                    {tarefa.onde && <div><span style={{ color: '#64748b', fontWeight: 700 }}>ONDE:</span> {tarefa.onde}</div>}
                                                                    {tarefa.quanto && <div><span style={{ color: '#64748b', fontWeight: 700 }}>QUANTO:</span> {formatarValorReal(tarefa.quanto)}</div>}
                                                                    {tarefa.porque && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 700 }}>POR QUÊ:</span> {tarefa.porque}</div>}
                                                                    {tarefa.como && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b', fontWeight: 700 }}>COMO:</span> {tarefa.como}</div>}
                                                                </div>
                                                                {observacaoTarefa && (
                                                                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#475569', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                                        <strong>Observações da tarefa:</strong> {observacaoTarefa}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );})}
                                                    </div>
                                                ) : (
                                                    <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', fontStyle: 'italic' }}>
                                                        Nenhuma tarefa detalhada neste passo.
                                                    </p>
                                                )}

                                                {tarefas.length === 0 && etapa.observacao && (
                                                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#475569', background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                        <strong>Observação antiga da etapa:</strong> {etapa.observacao}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div role="status" style={{ padding: '0.9rem 1rem', color: '#334155', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.95rem' }}>
                                    Esta ação ainda não tem matriz 5W2H
                                </div>
                            )}
                        </SecaoAcordeao>

                        <SecaoAcordeao
                            id="acao-foco-meta"
                            icone={ChartLineUp}
                            titulo="Meta e indicador de resultado"
                            descricao="Resultados esperados e formas de acompanhar a ação."
                        >
                            {acaoAtual.meta || acaoAtual.indicador ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
                                    {acaoAtual.meta && (
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ margin: '0 0 0.4rem', color: '#334155', fontSize: '0.875rem', fontWeight: 800 }}>Meta Oficial PETRANS 2030</h3>
                                            <p style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{acaoAtual.meta}</p>
                                        </div>
                                    )}
                                    {acaoAtual.indicador && (
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <h3 style={{ margin: '0 0 0.4rem', color: '#334155', fontSize: '0.875rem', fontWeight: 800 }}>Indicador de Resultado</h3>
                                            <p style={{ margin: 0, color: '#1e293b', fontSize: '0.95rem', lineHeight: 1.55 }}>{acaoAtual.indicador}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>Não há meta ou indicador cadastrado para esta ação.</p>
                            )}
                        </SecaoAcordeao>

                        <SecaoAcordeao
                            id="acao-foco-comite"
                            icone={ShieldCheck}
                            titulo="Comitê Gestor e deliberações"
                            descricao="Pareceres, votos e decisão do Comitê Gestor."
                        >
                            {!votosComiteAcao.length && !parecerFinalComite ? (
                                <p role="status" style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>
                                    Ainda não há pareceres ou votos registrados para esta ação.
                                </p>
                            ) : (
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
                                            <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                                                {matrizDaAcaoAtual?.dataCriacao ? new Date(matrizDaAcaoAtual.dataCriacao).toLocaleDateString('pt-BR') : 'Data registrada'}
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.875rem' }}>
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
                                            <span style={{ fontSize: '0.75rem', color: '#6d28d9', fontWeight: 700, background: '#faf5ff', padding: '2px 8px', borderRadius: '6px' }}>
                                                Pareceres Fundamentados
                                            </span>
                                        </div>

                                        {/* Relação de Votos dos Membros */}
                                        {votosComiteAcao.length > 0 ? (
                                            <div style={{ display: 'grid', gap: '0.65rem' }}>
                                                {votosComiteAcao.map((v, i) => (
                                                    <div key={v.id || i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem 0.9rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                            <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                                                                {v.membro || v.usuario?.email || 'Membro do Comitê Gestor'}
                                                            </strong>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: (v.voto === 'APROVAR' ? '#dcfce7' : '#fee2e2'), color: (v.voto === 'APROVAR' ? '#166534' : '#991b1b') }}>
                                                                Voto: {v.voto}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.875rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                            "{v.comentario || 'Sem parecer adicional.'}"
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>
                                                Não há votos registrados nesta deliberação.
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
                                            <span style={{ fontSize: '0.875rem', color: '#166534', fontWeight: 700 }}>
                                                {matrizDaAcaoAtual?.dataAvaliacao ? new Date(matrizDaAcaoAtual.dataAvaliacao).toLocaleDateString('pt-BR') : 'Decisão Homologada'}
                                            </span>
                                        </div>

                                        {parecerFinalComite ? (
                                            <div style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem 0.95rem' }}>
                                                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                    Parecer Oficial do Comitê Gestor
                                                </span>
                                                <p style={{ margin: 0, color: '#166534', fontSize: '0.875rem', lineHeight: 1.55 }}>
                                                    {parecerFinalComite}
                                                </p>
                                            </div>
                                        ) : (
                                            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.875rem' }}>
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
                                        <p style={{ margin: 0, color: '#475569', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                            Com a aprovação, as tarefas 5W2H são atualizadas conforme são concluídas. O avanço percentual alimenta os 4 Eixos do PETRANS em tempo real.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            )}
                        </SecaoAcordeao>
                    </div>
                    </>
                    )}
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
                                className="dashboard-button-toggle"
                                type="button"
                                onClick={() => setApenasEstrategicos(false)}
                                aria-pressed={!apenasEstrategicos}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: !apenasEstrategicos ? '2px solid #2563eb' : '1px solid #cbd5e1', background: !apenasEstrategicos ? '#eff6ff' : '#fff', color: !apenasEstrategicos ? '#1e40af' : '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                                Todos ({projetos.length})
                            </button>
                            <button
                                className="dashboard-button-toggle"
                                type="button"
                                onClick={() => setApenasEstrategicos(true)}
                                aria-pressed={apenasEstrategicos}
                                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: apenasEstrategicos ? '2px solid #ca8a04' : '1px solid #cbd5e1', background: apenasEstrategicos ? '#fefce8' : '#fff', color: apenasEstrategicos ? '#854d0e' : '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Star size={18} weight={apenasEstrategicos ? 'fill' : 'bold'} aria-hidden="true" />
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
                                                        className="dashboard-project-toggle"
                                                        type="button"
                                                        onClick={() => handleToggleEstrategico(proj.codigo, true, proj.nome)}
                                                        title="Remover status estratégico"
                                                        aria-pressed="true"
                                                        style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #facc15', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                                    >
                                                        <Star size={16} weight="fill" aria-hidden="true" />
                                                        ESTRATÉGICO
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="dashboard-project-toggle"
                                                        type="button"
                                                        onClick={() => handleToggleEstrategico(proj.codigo, false, proj.nome)}
                                                        title="Marcar como Estratégico"
                                                        aria-pressed="false"
                                                        style={{ background: '#f8fafc', color: '#64748b', border: '1px dashed #cbd5e1', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                                                    >
                                                        <Star size={16} weight="bold" aria-hidden="true" />
                                                        Marcar
                                                    </button>
                                                )
                                            ) : (
                                                proj.isEstrategico && (
                                                    <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 800 }}>
                                                        <Star size={16} weight="fill" style={{ verticalAlign: 'middle', marginRight: '4px' }} aria-hidden="true" />
                                                        ESTRATÉGICO
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
        </div>
    );
}

const estiloKpiCard = () => ({
    background: '#fff',
    border: '1px solid #d7e0e9',
    borderRadius: '8px',
    padding: '1.25rem'
});

const estiloKpiNumero = {
    fontSize: '2.2rem',
    color: '#0b4383',
    margin: '4px 0 0 0',
    fontWeight: 800
};

const estiloKpiLabel = {
    fontSize: '0.78rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    display: 'block'
};

const estiloRotuloFiltro = {
    display: 'block',
    marginBottom: '0.35rem',
    color: '#334155',
    fontSize: '0.75rem',
    fontWeight: 800,
    lineHeight: 1.4
};

const estiloCampoFiltro = {
    width: '100%',
    minWidth: 0,
    minHeight: '44px',
    boxSizing: 'border-box',
    padding: '0.65rem 0.75rem',
    border: '1px solid #94a3b8',
    borderRadius: '8px',
    background: '#fff',
    color: '#0f172a',
    fontSize: '0.875rem'
};

const estiloNumeroResumo = {
    display: 'block',
    color: '#0f172a',
    fontSize: '1.45rem',
    lineHeight: 1.2,
    overflowWrap: 'anywhere'
};

const estiloRotuloResumo = {
    display: 'block',
    marginTop: '0.25rem',
    color: '#334155',
    fontSize: '0.75rem',
    lineHeight: 1.4
};

const estiloNumeroResumoContexto = {
    ...estiloNumeroResumo,
    color: '#fff'
};

const estiloRotuloResumoContexto = {
    ...estiloRotuloResumo,
    color: '#dbeafe'
};

const estiloEtiquetaAcao = (fundo, cor) => ({
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: '100%',
    padding: '0.35rem 0.65rem',
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    background: fundo,
    color: cor,
    fontSize: '0.75rem',
    fontWeight: 700,
    lineHeight: 1.35,
    overflowWrap: 'anywhere'
});

const estiloAba = (ativa) => ({
    background: ativa ? '#0b4383' : 'transparent',
    color: ativa ? '#fff' : '#475569',
    border: '1px solid transparent',
    padding: '0.7rem 1.1rem',
    borderRadius: '6px 6px 0 0',
    fontWeight: 700,
    fontSize: '0.92rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
    boxShadow: 'none'
});
