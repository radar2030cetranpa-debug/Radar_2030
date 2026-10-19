// src/services/exportService.js
import * as XLSX from 'xlsx';

export function exportarMatrizesAprovadasCSV(matrizes) {
    const aprovadas = matrizes.filter(r => r.status === 'APROVADO');

    if (aprovadas.length === 0) {
        return { sucesso: false, mensagem: 'Nenhuma matriz aprovada encontrada para exportar.' };
    }

    const cabecalho = ['ID', 'Nome da Acao', 'Criado Por', 'O Que', 'Por Que', 'Onde', 'Quando', 'Como', 'Quanto', 'Impacto', 'Progresso', 'Parecer Comite', 'Data de Aprovacao'];

    const linhas = aprovadas.map(reg => {
        return [
            `"${reg.id || ''}"`,
            `"${(reg.nome || '').replace(/"/g, '""')}"`,
            `"${reg.criadoPor?.email || reg.criadoPor || ''}"`,
            `"${(reg.oque || '').replace(/"/g, '""')}"`,
            `"${(reg.porque || '').replace(/"/g, '""')}"`,
            `"${(reg.onde || '').replace(/"/g, '""')}"`,
            `"${reg.quando || ''}"`,
            `"${(reg.como || '').replace(/"/g, '""')}"`,
            `"${reg.quanto || ''}"`,
            `"${reg.impacto || ''}"`,
            `"${reg.percentual || 0}%"`,
            `"${(reg.comentarioComite || '').replace(/"/g, '""')}"`,
            `"${reg.dataAvaliacao ? new Date(reg.dataAvaliacao).toLocaleDateString('pt-BR') : ''}"`
        ].join(';');
    });

    const conteudoCSV = [cabecalho.join(';'), ...linhas].join('\n');
    const blob = new Blob(["\ufeff" + conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `matrizes_aprovadas_radar2030_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return { sucesso: true, quantidade: aprovadas.length };
}

export function exportarMatrizesAprovadasExcel(matrizes) {
    const aprovadas = matrizes.filter(r => r.status === 'APROVADO');

    if (aprovadas.length === 0) {
        return { sucesso: false, mensagem: 'Nenhuma matriz aprovada encontrada para exportar.' };
    }

    const dadosFormatados = aprovadas.map((reg, index) => ({
        'Item': index + 1,
        'ID da Matriz': reg.id || '',
        'Nome da Ação': reg.nome || '',
        'Criado Por': reg.criadoPor?.email || reg.criadoPor || '',
        'O Quê?': reg.oque || '',
        'Por Quê?': reg.porque || '',
        'Onde?': reg.onde || '',
        'Quando?': reg.quando || '',
        'Como?': reg.como || '',
        'Quanto (Custo)': reg.quanto || '',
        'Impacto': reg.impacto || '',
        'Progresso (%)': `${reg.percentual || 0}%`,
        'Parecer do Comitê Gestor': reg.comentarioComite || '',
        'Data de Aprovação': reg.dataAvaliacao ? new Date(reg.dataAvaliacao).toLocaleDateString('pt-BR') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Matrizes Aprovadas");

    const nomeArquivo = `matrizes_aprovadas_radar2030_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    return { sucesso: true, quantidade: aprovadas.length };
}