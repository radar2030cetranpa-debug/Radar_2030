// src/services/progresso.js
// Calcula o percentual de andamento de cada Ação a partir do checklist de etapas
// definido no formulário, e agrega esse percentual por Objetivo (OG), Eixo (LAE)
// e Setor responsável — alimentando o Painel CETRAN 2030.

import { acoesEstrategicas } from './acoes_data';

/**
 * Modelo de detalhamento de uma Ação (Radar 2030):
 *
 *   Ação -> Etapas -> Tarefas, e cada Tarefa carrega seu próprio 5W2H.
 *
 *   etapa  = { id, titulo, impacto, observacao, tarefas: [tarefa], concluida? }
 *   tarefa = { id, titulo, porque, quem, onde, quando, como, quanto, concluida, concluidaEm }
 *
 * Cada tarefa concluída representa uma parte concluída da etapa; cada etapa
 * pesa igual dentro da ação. Etapas legadas (sem "tarefas", só com "concluida")
 * continuam válidas e contam como 0% ou 100%.
 */

export const CAMPOS_5W2H_TAREFA = [
    { chave: 'titulo', rotulo: 'O quê?', dica: 'Descreva com clareza a tarefa a ser realizada.', tipo: 'textarea' },
    { chave: 'porque', rotulo: 'Por quê?', dica: 'Justifique a necessidade da tarefa.', tipo: 'textarea' },
    { chave: 'quem', rotulo: 'Quem?', dica: 'Nome ou função do responsável pela tarefa.', tipo: 'text' },
    { chave: 'onde', rotulo: 'Onde?', dica: 'Local onde a tarefa será realizada.', tipo: 'text' },
    { chave: 'quando', rotulo: 'Quando?', dica: 'Data ou período de realização da tarefa.', tipo: 'date' },
    { chave: 'como', rotulo: 'Como?', dica: 'Procedimentos a serem adotados na tarefa.', tipo: 'textarea' },
    { chave: 'quanto', rotulo: 'Quanto?', dica: 'Recursos necessários para realizar a tarefa.', tipo: 'text' }
];

const formatadorReal = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

export function obterNumeroReal(valor) {
    const texto = String(valor ?? '').trim();
    if (!texto) return null;

    const normalizado = texto.includes(',')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto;
    const numero = Number(normalizado);
    return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

export function formatarNumeroReal(valor) {
    const numero = obterNumeroReal(valor);
    return numero === null ? '' : formatadorReal.format(numero);
}

export function formatarValorReal(valor) {
    const numero = obterNumeroReal(valor);
    return numero === null ? String(valor ?? '') : `R$ ${formatadorReal.format(numero)}`;
}

export function converterEntradaParaReal(valor) {
    const digitos = valor.replace(/\D/g, '');
    if (!digitos) return '';

    const reais = (digitos.slice(0, -2) || '0').replace(/^0+(?=\d)/, '');
    const centavos = digitos.slice(-2).padStart(2, '0');
    return `${reais}.${centavos}`;
}

export function criarTarefaVazia() {
    return {
        id: `TF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        titulo: '', porque: '', quem: '', onde: '', quando: '', como: '', quanto: '',
        impacto: 'MEDIO', observacao: '',
        concluida: false
    };
}

export function criarEtapaVazia(titulo = '') {
    return {
        id: `ET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        titulo,
        tarefas: []
    };
}

export function migrarMetadadosEtapaParaTarefas(etapas = []) {
    return etapas.map(etapa => {
        const tarefas = Array.isArray(etapa.tarefas) ? etapa.tarefas : [];
        if (tarefas.length === 0) return etapa;

        const { impacto, observacao, ...etapaSemMetadados } = etapa;
        return {
            ...etapaSemMetadados,
            tarefas: tarefas.map((tarefa, indice) => ({
                ...tarefa,
                impacto: tarefa.impacto || impacto || 'MEDIO',
                observacao: tarefa.observacao || (indice === 0 ? observacao : '') || ''
            }))
        };
    });
}

export function etapaTemTarefas(etapa) {
    return Array.isArray(etapa?.tarefas) && etapa.tarefas.length > 0;
}

/** Percentual de uma única etapa: tarefas concluídas / total de tarefas. */
export function calcularPercentualEtapa(etapa) {
    if (!etapa) return 0;
    if (etapaTemTarefas(etapa)) {
        const concluidas = etapa.tarefas.filter(t => t.concluida).length;
        return Math.round((concluidas / etapa.tarefas.length) * 100);
    }
    return etapa.concluida ? 100 : 0; // etapa legada, sem tarefas
}

/**
 * Percentual de conclusão de uma Ação a partir das suas etapas (média simples
 * entre as etapas). Sem etapas definidas = 0%, não "indefinido".
 */
export function calcularPercentualEtapas(etapas) {
    if (!etapas || etapas.length === 0) return 0;
    const soma = etapas.reduce((acc, e) => acc + calcularPercentualEtapa(e), 0);
    return Math.round(soma / etapas.length);
}

/** Totais de tarefas de uma lista de etapas (para resumos). */
export function contarTarefas(etapas = []) {
    let total = 0;
    let concluidas = 0;
    etapas.forEach(e => {
        if (etapaTemTarefas(e)) {
            total += e.tarefas.length;
            concluidas += e.tarefas.filter(t => t.concluida).length;
        }
    });
    return { total, concluidas };
}

/** Setores do Radar 2030. Os núcleos pertencem à Secretaria-Executiva. */
export const SETORES_RADAR = [
    { chave: 'Presidência', rotulo: 'Presidência', pai: null },
    { chave: 'Secretaria-Executiva', rotulo: 'Secretaria-Executiva', pai: null },
    { chave: 'Núcleo Administrativo', rotulo: 'Núcleo Administrativo', pai: 'Secretaria-Executiva' },
    { chave: 'Núcleo Recursos', rotulo: 'Núcleo Recursos', pai: 'Secretaria-Executiva' },
    { chave: 'Núcleo GeoCetran', rotulo: 'Núcleo GeoCetran', pai: 'Secretaria-Executiva' },
    { chave: 'Núcleo ICetran', rotulo: 'Núcleo ICetran', pai: 'Secretaria-Executiva' },
    { chave: 'Núcleo JusCetran', rotulo: 'Núcleo JusCetran', pai: 'Secretaria-Executiva' },
    { chave: 'CTSEG', rotulo: 'CTSEG - Comissão Temática de Segurança Viária', pai: null },
    { chave: 'CTSIST', rotulo: 'CTSIST - Comissão Temática de Sistema de Trânsito', pai: null },
    { chave: 'CTEDUC', rotulo: 'CTEDUC - Comissão Temática de Educação para o Trânsito', pai: null }
];

const ALIASES_SETOR = {
    'presidencia': 'Presidência',
    'presidencia do cetran': 'Presidência',
    'secretaria executiva': 'Secretaria-Executiva',
    'secretaria nexecutiva': 'Secretaria-Executiva',
    'sec exec': 'Secretaria-Executiva',
    'secexec': 'Secretaria-Executiva',
    'nucleo administrativo': 'Núcleo Administrativo',
    'nucleo recursos': 'Núcleo Recursos',
    'nucleo geocetran': 'Núcleo GeoCetran',
    'geocetran': 'Núcleo GeoCetran',
    'nucleo icetran': 'Núcleo ICetran',
    'icetran': 'Núcleo ICetran',
    'nucleo juscetran': 'Núcleo JusCetran',
    'juscetran': 'Núcleo JusCetran',
    'ctseg': 'CTSEG',
    'ctsist': 'CTSIST',
    'cteduc': 'CTEDUC'
};

/** Converte variações de escrita para o nome oficial do setor; desconhecidos ficam como estão. */
export function normalizarSetor(texto) {
    const original = (texto || '').trim();
    if (!original) return '';
    const chave = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return ALIASES_SETOR[chave] || original;
}

/**
 * Divide um campo "setor" tipo "CTSIST, Secretaria-Executiva" em uma lista limpa.
 * Ações sem setor definido caem em "Não classificado" para não sumirem da agregação.
 */
export function listarSetoresDaAcao(setorTexto) {
    if (!setorTexto || !setorTexto.trim()) return ['Não classificado'];
    const setores = setorTexto.split(',').map(s => normalizarSetor(s)).filter(Boolean);
    return [...new Set(setores)];
}

/**
 * Varre todos os registros (Matrizes) com status "APROVADO" e monta um mapa
 * { acaoId: percentual } com o andamento oficial de cada Ação estratégica.
 * Só Matrizes aprovadas contam — antes disso o checklist só está sendo planejado.
 * Se a mesma Ação aparecer em mais de uma Matriz aprovada, usa a mais recente.
 *
 * @param {Array} matrizes - lista de matrizes vindas da API
 */
export function obterPercentuaisPorAcao(matrizes = []) {
    const aprovadas = [...matrizes]
        .filter(r => r.status === 'APROVADO')
        .sort((a, b) => new Date(a.dataCriacao) - new Date(b.dataCriacao));

    const percentualPorAcao = {};
    aprovadas.forEach(registro => {
        (registro.acoes || []).forEach(acaoNaMatriz => {
            const acaoId = acaoNaMatriz.acaoId || acaoNaMatriz.acao?.id;
            const etapas = acaoNaMatriz.etapas || [];
            if (acaoId) {
                percentualPorAcao[acaoId] = calcularPercentualEtapas(etapas);
            }
        });
    });
    return percentualPorAcao;
}

const media = (valores) => {
    if (!valores.length) return 0;
    return Math.round(valores.reduce((soma, v) => soma + v, 0) / valores.length);
};

/**
 * Agrega o percentual por Objetivo (og), Projeto e Setor.
 * Ações que ainda não têm Matriz aprovada entram com 0% — assim o painel mostra
 * o andamento real do plano todo, não só do que já foi medido.
 * Agregação sempre por média simples entre os itens do grupo (não ponderada).
 *
 * @param {Array} matrizes - lista de matrizes vindas da API
 */
export function agregarProgresso(matrizes = []) {
    const percentualPorAcao = obterPercentuaisPorAcao(matrizes);

    const porObjetivo = {};
    const porProjeto = {};
    const porSetor = {};
    const nomeDoProjeto = {};

    acoesEstrategicas.forEach(acao => {
        const percentual = percentualPorAcao[acao.id] ?? 0;

        if (acao.og) {
            (porObjetivo[acao.og] ||= []).push(percentual);
        }
        if (acao.projetoCodigo) {
            (porProjeto[acao.projetoCodigo] ||= []).push(percentual);
            if (!nomeDoProjeto[acao.projetoCodigo]) {
                nomeDoProjeto[acao.projetoCodigo] = acao.projetoNome || acao.projetoCodigo;
            }
        }
        listarSetoresDaAcao(acao.setor).forEach(setor => {
            (porSetor[setor] ||= []).push(percentual);
        });
    });

    const paraLista = (mapa, rotulos) =>
        Object.entries(mapa)
            .map(([chave, valores]) => ({
                chave,
                rotulo: rotulos ? `${chave}: ${rotulos[chave]}` : chave,
                percentual: media(valores),
                totalAcoes: valores.length
            }))
            .sort((a, b) => a.chave.localeCompare(b.chave, 'pt-BR', { numeric: true }));

    return {
        objetivos: paraLista(porObjetivo),
        projetos: paraLista(porProjeto, nomeDoProjeto),
        setores: paraLista(porSetor)
    };
}

/** Extrai um rótulo curto de exibição a partir do texto completo do OG/LAE/Projeto. */
export function rotuloCurto(textoCompleto) {
    if (!textoCompleto) return '';
    const [codigo] = textoCompleto.split(':');
    return codigo.trim();
}
