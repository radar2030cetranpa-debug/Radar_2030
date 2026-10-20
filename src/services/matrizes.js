// src/services/matrizes.js
import { api } from './api';

export function listarMatrizes(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.usuarioId) query.set('usuarioId', params.usuarioId);
  const qs = query.toString();
  return api.get(`/matrizes${qs ? `?${qs}` : ''}`);
}

export function buscarMatriz(id) {
  return api.get(`/matrizes/${id}`);
}

export function criarMatriz(dados) {
  return api.post('/matrizes', dados);
}

export function atualizarMatriz(id, dados) {
  return api.put(`/matrizes/${id}`, dados);
}

export function removerMatriz(id) {
  return api.delete(`/matrizes/${id}`);
}

export function enviarParaComite(id) {
  return api.post(`/matrizes/${id}/enviar`);
}

/** Voto consultivo de Conselheiro (COMITE) ou Admin Geral. */
export function votarMatriz(id, voto, comentario) {
  return api.post(`/matrizes/${id}/votar`, { voto, comentario });
}

/** Decisão final — só Admin Geral. */
export function avaliarMatriz(id, status, comentario) {
  return api.post(`/matrizes/${id}/avaliar`, { status, comentario });
}

/** Atualizar etapas e percentual de matriz aprovada */
export function atualizarProgressoMatriz(id, dados) {
  return api.patch(`/matrizes/${id}/progresso`, dados);
}

/** Histórico completo de revisões, deliberações e votos da matriz */
export function buscarHistoricoMatriz(id) {
  return api.get(`/matrizes/${id}/historico`);
}

