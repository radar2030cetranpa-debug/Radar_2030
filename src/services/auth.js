// src/services/auth.js
import { api, ApiError, salvarToken, salvarUsuarioCache, obterUsuarioCache, limparSessaoApi } from './api';

/**
 * Faz login via API. Em caso de sucesso, guarda o token JWT e um cache do
 * perfil do usuário no localStorage (nunca a senha).
 */
export async function login(email, senha) {
  const resposta = await api.post('/auth/login', { email, senha }, { autenticado: false });
  salvarToken(resposta.access_token);
  salvarUsuarioCache(resposta.usuario);
  return resposta.usuario;
}

export function logout() {
  limparSessaoApi();
}

export function usuarioEmCache() {
  return obterUsuarioCache();
}

/**
 * Revalida a sessão contra o backend (garante que o token ainda é válido e
 * que o cache local do usuário está atualizado — por exemplo, se o perfil
 * ou setor mudou desde o último login).
 */
export async function revalidarSessao() {
  try {
    const usuario = await api.get('/auth/profile');
    salvarUsuarioCache(usuario);
    return usuario;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      limparSessaoApi();
      return null;
    }

    throw err;
  }
}

export async function trocarSenha(senhaAtual, novaSenha) {
  return api.put('/auth/trocar-senha', { senhaAtual, novaSenha });
}

export async function recuperarSenha(email) {
  return api.post('/auth/recuperar-senha', { email }, { autenticado: false });
}

export async function redefinirSenha(token, novaSenha) {
  return api.post('/auth/redefinir-senha', { token, novaSenha }, { autenticado: false });
}

/** Regra do plano de segurança, espelhada aqui só para validação client-side amigável. */
export function validarForcaSenha(senha) {
  const erros = [];
  if (!senha || senha.length < 8) erros.push('mínimo 8 caracteres');
  if (!/[A-Z]/.test(senha || '')) erros.push('ao menos 1 letra maiúscula');
  if (!/[0-9]/.test(senha || '')) erros.push('ao menos 1 número');
  return erros;
}
