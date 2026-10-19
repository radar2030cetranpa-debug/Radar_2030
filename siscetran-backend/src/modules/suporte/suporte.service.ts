import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { CriarSuporteDto } from './dto/criar-suporte.dto';

const EMAIL_CONTATO = 'radar2030cetranpa@gmail.com';

@Injectable()
export class SuporteService {
  private criarTransporter(): Transporter {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || EMAIL_CONTATO;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new ServiceUnavailableException('O serviço de e-mail do suporte não está configurado.');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }

  async enviarSolicitacao(dto: CriarSuporteDto) {
    const destinatario = process.env.SUPPORT_EMAIL || EMAIL_CONTATO;

    const remetente = process.env.SMTP_FROM || EMAIL_CONTATO;
    const transporter = this.criarTransporter();

    await transporter.sendMail({
      from: remetente,
      to: destinatario,
      replyTo: dto.email || remetente,
      subject: `[SAEP] Suporte técnico - ${dto.tipoProblema}`,
      text: [
        `Nome: ${dto.nome}`,
        `E-mail: ${dto.email}`,
        `Telefone: ${dto.telefone}`,
        `Tipo de problema: ${dto.tipoProblema}`,
        '',
        'Descrição:',
        dto.descricao,
      ].join('\n'),
    });

    return { message: 'Solicitação enviada ao suporte técnico.' };
  }
}
