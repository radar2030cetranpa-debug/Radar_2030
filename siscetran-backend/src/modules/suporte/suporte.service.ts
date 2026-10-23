import { Injectable } from '@nestjs/common';
import { CriarSuporteDto } from './dto/criar-suporte.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SuporteService {
  constructor(private readonly mailService: MailService) {}

  async enviarSolicitacao(dto: CriarSuporteDto) {
    await this.mailService.enviarEmailSuporte({
      para: process.env.SUPPORT_EMAIL || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER || '',
      replyTo: dto.email,
      subject: `[Radar 2030] Suporte técnico - ${dto.tipoProblema}`,
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
