// src/services/api.js
// Cliente central para conversar com a API do backend NestJS.

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const REQUEST_TIMEOUT_MS = 15000;

const TOKEN_KEY = 'siscetran_token';
const USUARIO_KEY = 'siscetran_usuario';

export function salvarToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function obterToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function salvarUsuarioCache(usuario) {
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function obterUsuarioCache() {
  try {
    const dados = localStorage.getItem(USUARIO_KEY);
    return dados ? JSON.parse(dados) : null;
  } catch {
    return null;
  }
}

export function limparSessaoApi() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

/**
 * Erro customizado que carrega o status HTTP e a mensagem vinda do backend,
 * para que as telas possam distinguir, por exemplo, "senha expirada" de
 * "credenciais inválidas".
 */
export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, autenticado = true, semToken = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  if (autenticado && !semToken) {
    const token = obterToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    let payload = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await response.json().catch((err) => {
        if (err?.name === 'AbortError') throw err;
        return null;
      });
    }

    if (!response.ok) {
      // Sessão expirada/token inválido: limpa a sessão local.
      if (response.status === 401 && autenticado) {
        limparSessaoApi();
      }

      const mensagem =
        (payload && (payload.message || payload.error)) ||
        `Erro ${response.status} ao comunicar com o servidor`;

      const mensagemFinal = Array.isArray(mensagem) ? mensagem.join(', ') : mensagem;

      throw new ApiError(mensagemFinal, response.status, payload);
    }

    return payload;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err?.name === 'AbortError') {
      throw new ApiError(
        'O servidor demorou para responder. Tente novamente em alguns instantes.',
        0,
        null,
      );
    }

    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.',
      0,
      null,
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body, opts = {}) => request(path, { method: 'POST', body, ...opts }),
  put: (path, body, opts = {}) => request(path, { method: 'PUT', body, ...opts }),
  patch: (path, body, opts = {}) => request(path, { method: 'PATCH', body, ...opts }),
  delete: (path) => request(path, { method: 'DELETE' }),
};
