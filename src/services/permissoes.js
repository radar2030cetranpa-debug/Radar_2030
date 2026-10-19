// src/services/permissoes.js
// Espelha, no frontend, a matriz de permissões que o backend já aplica de
// verdade. Isso é só para UX (mostrar/esconder botões) — a segurança real
// está sempre no backend.

export const ROLES = {
  USUARIO: 'USUARIO',
  COMITE: 'COMITE',
  ADMIN_SETOR: 'ADMIN_SETOR',
  ADMIN_GERAL: 'ADMIN_GERAL',
};

export const ROLE_LABELS = {
  USUARIO: 'Usuário do Setor',
  COMITE: 'Usuário do Comitê Gestor',
  ADMIN_SETOR: 'Admin do Setor',
  ADMIN_GERAL: 'Admin Geral',
};

export function labelRole(role) {
  return ROLE_LABELS[role] || role;
}

export function ehComiteOuAdminGeral(usuario) {
  return Boolean(usuario && (usuario.role === ROLES.COMITE || usuario.role === ROLES.ADMIN_GERAL));
}

export function ehAdmin(usuario) {
  return Boolean(usuario && (usuario.role === ROLES.ADMIN_SETOR || usuario.role === ROLES.ADMIN_GERAL));
}

export function ehAdminGeral(usuario) {
  return Boolean(usuario && usuario.role === ROLES.ADMIN_GERAL);
}

/** Criar solicitação: todos os perfis podem. */
export function podeCriarMatriz() {
  return true;
}

/** Editar/Excluir: dono (USUARIO), Admin do Setor (mesmo setor) ou Admin Geral. Usuário do Comitê Gestor nunca. */
export function podeEditarOuExcluirMatriz(usuario, matriz) {
  if (!usuario || !matriz) return false;
  if (usuario.role === ROLES.ADMIN_GERAL) return true;
  if (usuario.role === ROLES.USUARIO) {
    return matriz.criadoPorId === usuario.id || matriz.criadoPor?.id === usuario.id;
  }
  if (usuario.role === ROLES.ADMIN_SETOR) {
    return matriz.criadoPor?.setor === usuario.setor;
  }
  return false;
}

/** Votar: Usuário do Comitê Gestor e Admin Geral. */
export function podeVotar(usuario) {
  return ehComiteOuAdminGeral(usuario);
}

/** Aprovar definitivamente: só Admin Geral. */
export function podeAprovarDefinitivamente(usuario) {
  return ehAdminGeral(usuario);
}

/** Criar/desativar usuários: Admin do Setor (só do próprio setor) e Admin Geral. */
export function podeGerenciarUsuarios(usuario) {
  return ehAdmin(usuario);
}

/** Alterar perfil (role) de um usuário: só Admin Geral. */
export function podeAlterarRole(usuario) {
  return ehAdminGeral(usuario);
}

export function labelStatus(status) {
  const mapa = {
    RASCUNHO: 'Rascunho',
    ENVIADO: 'Enviado',
    APROVADO: 'Aprovado',
    PENDENTE: 'Pendente',
  };
  return mapa[status] || status;
}

export function labelImpacto(impacto) {
  const mapa = { BAIXO: 'Baixo', MEDIO: 'Médio', ALTO: 'Alto' };
  return mapa[impacto] || impacto;
}

export function labelPrazo(prazo) {
  const mapa = { CURTO_PRAZO: 'Curto Prazo', MEDIO_PRAZO: 'Médio Prazo', LONGO_PRAZO: 'Longo Prazo' };
  return mapa[prazo] || prazo;
}
