import * as crypto from 'crypto';

/** Token enviado por e-mail (em texto) e o hash que vai para o banco. */
export function gerarTokenSenha() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token) };
}

/** O banco guarda apenas o hash: um vazamento da tabela não expõe tokens válidos. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
