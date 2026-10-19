// src/services/analytics.js
// Comunicação com o microsserviço analítico FastAPI (Python)

const BASE_URL = import.meta.env.VITE_ANALYTICS_API_URL || 'http://localhost:8000';

async function fetchAnalytics(endpoint, options = {}) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.mensagem || `Erro ${res.status} no serviço analítico`);
    }

    return res.json();
}

/**
 * Permite a administradores (ADMIN e ADMIN_SETOR) marcar/desmarcar a estrela de projeto estratégico.
 */
export function alternarProjetoEstrategico(codigo, isEstrategico, usuarioEmail = '') {
    return fetchAnalytics('/analytics/projetos/toggle-estrategico', {
        method: 'POST',
        body: JSON.stringify({
            codigo,
            isEstrategico,
            usuarioEmail
        })
    });
}

/**
 * Resumo geral integrado contemplando KPIs e dados consolidados das 5 visões.
 */
export function buscarResumoAnalytics(setor = '') {
    const query = setor ? `?setor=${encodeURIComponent(setor)}` : '';
    return fetchAnalytics(`/analytics/resumo${query}`);
}

/**
 * VISÃO 1: Avanço dos 4 Eixos do PETRANS.
 */
export function buscarAvancoEixos(setor = '') {
    const query = setor ? `?setor=${encodeURIComponent(setor)}` : '';
    return fetchAnalytics(`/analytics/eixos${query}`);
}

/**
 * VISÃO 2: Todos os 21 Projetos com destaque nos 8 Estratégicos.
 */
export function buscarProjetos(setor = '', apenasEstrategicos = false) {
    const params = new URLSearchParams();
    if (setor) params.append('setor', setor);
    if (apenasEstrategicos) params.append('apenasEstrategicos', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAnalytics(`/analytics/projetos${query}`);
}

/**
 * VISÃO 3: Progresso por Objetivos Gerais (OG) e Linhas de Ação (LAE).
 */
export function buscarObjetivos(setor = '') {
    const query = setor ? `?setor=${encodeURIComponent(setor)}` : '';
    return fetchAnalytics(`/analytics/objetivos${query}`);
}

/**
 * VISÃO 4: Ações vs. Metas por Horizontes de Prazo (Curto, Médio e Longo Prazo).
 */
export function buscarPrazos(horizonte = '', setor = '') {
    const params = new URLSearchParams();
    if (horizonte) params.append('horizonte', horizonte);
    if (setor) params.append('setor', setor);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAnalytics(`/analytics/prazos${query}`);
}

/**
 * VISÃO 5: Desempenho por Setores e Lente de Setor.
 */
export function buscarSetores(setor = '') {
    const query = setor ? `?setor=${encodeURIComponent(setor)}` : '';
    return fetchAnalytics(`/analytics/setores${query}`);
}
