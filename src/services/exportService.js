// src/services/exportService.js
import * as XLSX from 'xlsx';

const formatarTexto = (valor) => {
    if (valor === null || valor === undefined) return '';
    if (typeof valor === 'string') return valor;
    if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
    return JSON.stringify(valor);
};

const formatarCSV = (valor) => `"${formatarTexto(valor).replace(/"/g, '""')}"`;

const formatarData = (valor) => {
    if (!valor) return '';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleDateString('pt-BR');
};

const contarTarefas = (etapas = []) => {
    let total = 0;
    let concluidas = 0;

    (etapas || []).forEach((etapa) => {
        if (!Array.isArray(etapa?.tarefas) || etapa.tarefas.length === 0) return;
        total += etapa.tarefas.length;
        concluidas += etapa.tarefas.filter((tarefa) => tarefa?.concluida).length;
    });

    return { total, concluidas };
};

const calcularPercentualEtapas = (etapas = []) => {
    if (!Array.isArray(etapas) || etapas.length === 0) return 0;

    const somatorio = etapas.reduce((soma, etapa) => {
        if (Array.isArray(etapa?.tarefas) && etapa.tarefas.length > 0) {
            const concluidas = etapa.tarefas.filter((tarefa) => tarefa?.concluida).length;
            return soma + Math.round((concluidas / etapa.tarefas.length) * 100);
        }
        return soma + (etapa?.concluida ? 100 : 0);
    }, 0);

    return Math.round(somatorio / etapas.length);
};

const resumirEtapas = (etapas = []) => {
    if (!Array.isArray(etapas) || etapas.length === 0) return 'Sem etapas definidas';

    return etapas.map((etapa, indice) => {
        const titulo = etapa?.titulo || `Etapa ${indice + 1}`;
        const tarefas = Array.isArray(etapa?.tarefas) && etapa.tarefas.length > 0
            ? etapa.tarefas.map((tarefa, pos) => {
                const nomeTarefa = tarefa?.titulo || `Tarefa ${pos + 1}`;
                return [
                    `Tarefa ${pos + 1}: ${nomeTarefa}`,
                    `O quê: ${tarefa?.titulo || ''}`,
                    `Por quê: ${tarefa?.porque || ''}`,
                    `Quem: ${tarefa?.quem || ''}`,
                    `Onde: ${tarefa?.onde || ''}`,
                    `Quando: ${tarefa?.quando || ''}`,
                    `Como: ${tarefa?.como || ''}`,
                    `Quanto: ${tarefa?.quanto || ''}`,
                    `Concluída: ${tarefa?.concluida ? 'Sim' : 'Não'}`,
                ].join(' | ');
            }).join(' ; ')
            : 'Sem tarefas cadastradas';

        return `${titulo} => ${tarefas}`;
    }).join(' || ');
};

const obterLinhasExportacao = (matrizes) => {
    const linhas = [];

    (matrizes || []).forEach((matriz) => {
        const acoes = Array.isArray(matriz?.acoes) ? matriz.acoes : [];

        if (acoes.length === 0) {
            linhas.push({
                'ID da Matriz': matriz?.id || '',
                'Nome da Matriz': matriz?.nome || '',
                'Status': matriz?.status || '',
                'Progresso da Matriz (%)': matriz?.percentual ?? 0,
                'Criado Por': matriz?.criadoPor?.email || matriz?.criadoPor || '',
                'Ação ID': '',
                'ID da Ação': '',
                'Nome da Ação': '',
                'Diretriz da Ação': '',
                'Setor Responsável': '',
                'O Que?': matriz?.oque || '',
                'Por Que?': matriz?.porque || '',
                'Onde?': matriz?.onde || '',
                'Quando?': matriz?.quando || '',
                'Como?': matriz?.como || '',
                'Quanto?': matriz?.quanto || '',
                'Impacto': matriz?.impacto || '',
                'Parecer do Comitê': matriz?.comentarioComite || '',
                'Etapas': 'Sem ações vinculadas',
                '5W2H': 'Sem ações vinculadas',
                'Qtd. Etapas': 0,
                'Qtd. Tarefas': 0,
                'Tarefas Concluídas': 0,
                'Progresso da Ação (%)': 0,
                'Data de Criação': formatarData(matriz?.dataCriacao),
                'Data de Avaliação': formatarData(matriz?.dataAvaliacao),
            });
            return;
        }

        acoes.forEach((item) => {
            const acao = item?.acao || {};
            const etapas = Array.isArray(item?.etapas) ? item.etapas : [];
            const resumoTarefas = contarTarefas(etapas);

            linhas.push({
                'ID da Matriz': matriz?.id || '',
                'Nome da Matriz': matriz?.nome || '',
                'Status': matriz?.status || '',
                'Progresso da Matriz (%)': matriz?.percentual ?? 0,
                'Criado Por': matriz?.criadoPor?.email || matriz?.criadoPor || '',
                'Ação ID': item?.acaoId || acao?.id || '',
                'ID da Ação': item?.acaoId || acao?.id || '',
                'Nome da Ação': acao?.diretriz || acao?.nome || '',
                'Diretriz da Ação': acao?.diretriz || '',
                'Setor Responsável': acao?.setor || acao?.responsavel || '',
                'O Que?': matriz?.oque || '',
                'Por Que?': matriz?.porque || '',
                'Onde?': matriz?.onde || '',
                'Quando?': matriz?.quando || '',
                'Como?': matriz?.como || '',
                'Quanto?': matriz?.quanto || '',
                'Impacto': matriz?.impacto || '',
                'Parecer do Comitê': matriz?.comentarioComite || '',
                'Etapas': resumirEtapas(etapas),
                '5W2H': resumirEtapas(etapas),
                'Qtd. Etapas': etapas.length,
                'Qtd. Tarefas': resumoTarefas.total,
                'Tarefas Concluídas': resumoTarefas.concluidas,
                'Progresso da Ação (%)': calcularPercentualEtapas(etapas),
                'Data de Criação': formatarData(matriz?.dataCriacao),
                'Data de Avaliação': formatarData(matriz?.dataAvaliacao),
            });
        });
    });

    return linhas;
};

export function exportarMatrizesAprovadasCSV(matrizes) {
    const exportaveis = Array.isArray(matrizes) ? matrizes : [];

    if (exportaveis.length === 0) {
        return { sucesso: false, mensagem: 'Nenhuma matriz encontrada para exportar.' };
    }

    const linhas = obterLinhasExportacao(exportaveis);
    const cabecalho = [
        'ID da Matriz',
        'Nome da Matriz',
        'Status',
        'Progresso da Matriz (%)',
        'Criado Por',
        'Ação ID',
        'Nome da Ação',
        'Diretriz da Ação',
        'Setor Responsável',
        'O Que?',
        'Por Que?',
        'Onde?',
        'Quando?',
        'Como?',
        'Quanto?',
        'Impacto',
        'Parecer do Comitê',
        'Etapas',
        '5W2H',
        'Qtd. Etapas',
        'Qtd. Tarefas',
        'Tarefas Concluídas',
        'Progresso da Ação (%)',
        'Data de Criação',
        'Data de Avaliação',
    ];

    const conteudoCSV = [
        cabecalho.map(formatarCSV).join(';'),
        ...linhas.map((linha) => cabecalho.map((campo) => formatarCSV(linha[campo])).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `matrizes_aprovadas_radar2030_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { sucesso: true, quantidade: linhas.length };
}

export function exportarMatrizesAprovadasExcel(matrizes) {
    const exportaveis = Array.isArray(matrizes) ? matrizes : [];

    if (exportaveis.length === 0) {
        return { sucesso: false, mensagem: 'Nenhuma matriz encontrada para exportar.' };
    }

    const linhas = obterLinhasExportacao(exportaveis);
    const worksheet = XLSX.utils.json_to_sheet(linhas);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Matrizes Radar 2030');

    const nomeArquivo = `matrizes_aprovadas_radar2030_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    return { sucesso: true, quantidade: linhas.length };
}