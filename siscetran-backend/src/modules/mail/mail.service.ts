import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export type TipoTokenSenha = 'convite' | 'recuperacao';

/**
 * Envio de e-mails do sistema (remetente: MAIL_FROM_ADDRESS, ex.: radar2030cetranpa@gmail.com).
 *
 * MAIL_PROVIDER:
 *  - gmail_api : Gmail API via HTTPS (OAuth2). Funciona no Render free (que bloqueia SMTP).
 *  - smtp      : SMTP do Gmail com senha de app. Funciona local e em instância paga do Render.
 *  - console   : não envia; só loga (apenas fora de produção). Padrão se nada for configurado.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get provider(): string {
    return (process.env.MAIL_PROVIDER || 'console').toLowerCase();
  }

  private get from(): string {
    const endereco = process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || '';
    const nome = process.env.MAIL_FROM_NAME || 'Radar 2030 - CETRAN/PA';
    return `"${nome}" <${endereco}>`;
  }

  /** Quando true, o backend pode devolver o token na resposta da API (somente dev). */
  get modoConsole(): boolean {
    return this.provider === 'console' && process.env.NODE_ENV !== 'production';
  }

  async enviarTokenSenha(para: string, token: string, tipo: TipoTokenSenha, validadeHoras: number) {
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const link = `${frontend}/?token=${encodeURIComponent(token)}`;
    const convite = tipo === 'convite';

    const assunto = convite
      ? 'Radar 2030 - Crie sua senha de acesso'
      : 'Radar 2030 - Redefinição de senha';
    const titulo = convite ? 'Seu acesso ao Radar 2030 foi criado' : 'Redefinição de senha';
    const intro = convite
      ? 'Um administrador cadastrou você no Radar 2030 (CETRAN/PA). Para ativar o acesso, crie sua senha:'
      : 'Recebemos um pedido para redefinir a senha da sua conta. Para continuar:';

    const html = `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
  <h2 style="margin-bottom:8px">${escapeHtml(titulo)}</h2>
  <p>${escapeHtml(intro)}</p>
  <p style="margin:24px 0">
    <a href="${escapeHtml(link)}" style="background:#2563eb;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
      ${escapeHtml(convite ? 'Criar minha senha' : 'Redefinir minha senha')}
    </a>
  </p>
  <p>Se o botão não funcionar, abra o sistema e cole este código no campo de token:</p>
  <p style="background:#f1f5f9;padding:10px;border-radius:6px;word-break:break-all;font-family:monospace;font-size:13px">${escapeHtml(token)}</p>
  <p style="color:#64748b;font-size:13px">Este código vale por ${validadeHoras} hora(s) e só pode ser usado uma vez.
  Se você não esperava este e-mail, ignore-o.</p>
</div>`;

    const texto =
      `${titulo}\n\n${intro}\n${link}\n\nCódigo: ${token}\n` +
      `Válido por ${validadeHoras} hora(s). Se você não esperava este e-mail, ignore-o.`;

    return this.enviar({ para, assunto, html, texto, tokenParaLog: token });
  }

  async enviarEmailSuporte(msg: { para: string; replyTo: string; subject: string; text: string }) {
    if (!msg.para) {
      throw new ServiceUnavailableException('O destinatário do suporte não está configurado.');
    }

    try {
      const email = {
        para: msg.para,
        replyTo: msg.replyTo,
        assunto: msg.subject,
        texto: msg.text,
      };

      switch (this.provider) {
        case 'gmail_api':
          await this.enviarGmailApi(email);
          break;
        case 'smtp':
          await this.enviarSmtp(email);
          break;
        default:
          throw new Error('MAIL_PROVIDER não configurado para envio.');
      }
      this.logger.log(`E-mail de suporte enviado para ${msg.para}`);
    } catch (err: any) {
      this.logger.error(`Falha ao enviar solicitação de suporte: ${err?.message || err}`);
      throw new ServiceUnavailableException('Não foi possível enviar a solicitação de suporte.');
    }
  }

  /** Retorna true se enviou; nunca lança (falha de e-mail não deve derrubar o cadastro). */
  private async enviar(msg: {
    para: string;
    assunto: string;
    html: string;
    texto: string;
    tokenParaLog: string;
  }): Promise<boolean> {
    try {
      switch (this.provider) {
        case 'gmail_api':
          await this.enviarGmailApi(msg);
          break;
        case 'smtp':
          await this.enviarSmtp(msg);
          break;
        default:
          if (this.modoConsole) {
            this.logger.warn(`[MAIL console] Para ${msg.para} | token: ${msg.tokenParaLog}`);
          } else {
            this.logger.error('MAIL_PROVIDER não configurado em produção: e-mail NÃO enviado.');
            return false;
          }
      }
      this.logger.log(`E-mail "${msg.assunto}" enviado para ${msg.para}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Falha ao enviar e-mail para ${msg.para}: ${err?.message || err}`);
      return false;
    }
  }

  // ---------- SMTP (nodemailer) ----------
  private async enviarSmtp(msg: {
    para: string;
    assunto: string;
    html?: string;
    texto: string;
    replyTo?: string;
  }) {
    const port = Number(process.env.SMTP_PORT) || 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      socketTimeout: 15000,
    });
    await transporter.sendMail({
      from: this.from,
      to: msg.para,
      subject: msg.assunto,
      replyTo: msg.replyTo,
      text: msg.texto,
      html: msg.html,
    });
  }

  // ---------- Gmail API (HTTPS, sem SMTP) ----------
  private async enviarGmailApi(msg: {
    para: string;
    assunto: string;
    html?: string;
    texto: string;
    replyTo?: string;
  }) {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GMAIL_CLIENT_ID || '',
        client_secret: process.env.GMAIL_CLIENT_SECRET || '',
        refresh_token: process.env.GMAIL_REFRESH_TOKEN || '',
        grant_type: 'refresh_token',
      }),
    });
    const tokenJson: any = await tokenResp.json();
    if (!tokenResp.ok || !tokenJson.access_token) {
      throw new Error(`OAuth Google falhou: ${tokenJson.error_description || tokenJson.error || tokenResp.status}`);
    }

    const b64 = (s: string) => Buffer.from(s, 'utf-8').toString('base64');
    const conteudo = msg.html || msg.texto;
    const corpo = b64(conteudo).replace(/(.{76})/g, '$1\r\n');
    const contentType = msg.html ? 'text/html' : 'text/plain';
    const mime = [
      `From: ${this.from}`,
      `To: ${msg.para}`,
      ...(msg.replyTo ? [`Reply-To: ${msg.replyTo}`] : []),
      `Subject: =?UTF-8?B?${b64(msg.assunto)}?=`,
      'MIME-Version: 1.0',
      `Content-Type: ${contentType}; charset=UTF-8`,
      'Content-Transfer-Encoding: base64',
      '',
      corpo,
    ].join('\r\n');

    const envio = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }),
    });
    if (!envio.ok) {
      throw new Error(`Gmail API ${envio.status}: ${await envio.text()}`);
    }
  }
}
