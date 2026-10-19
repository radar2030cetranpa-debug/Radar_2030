import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { RecuperarSenhaDto } from './dto/recuperar-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';

// Regra do plano de segurança: senha expira a cada 6 meses.
const SEIS_MESES_MS = 6 * 30 * 24 * 60 * 60 * 1000;
// Token de recuperação de senha válido por 1 hora.
const RESET_TOKEN_VALIDADE_MS = 60 * 60 * 1000;
const EMAIL_CONTATO = 'radar2030cetranpa@gmail.com';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, senha: string): Promise<any> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      return null;
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return null;
    }

    const {
      senha: _,
      resetToken: __,
      resetTokenExpiry: ___,
      ...result
    } = usuario;
    return result;
  }

  async login(loginDto: LoginDto) {
    const usuario = await this.validateUser(loginDto.email, loginDto.senha);
    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!usuario.ativo) {
      throw new UnauthorizedException(
        'Usuário desativado. Entre em contato com o administrador.',
      );
    }

    const senhaExpirada =
      Date.now() - usuario.ultimaTrocaSenha.getTime() > SEIS_MESES_MS;

    if (senhaExpirada) {
      throw new UnauthorizedException(
        'Sua senha expirou (mais de 6 meses sem troca). Use "Esqueci minha senha" para redefini-la.',
      );
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      role: usuario.role,
      setor: usuario.setor,
    };

    return {
      access_token: this.jwtService.sign(payload),
      usuario,
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, senha, role, setor } = registerDto;

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      throw new UnauthorizedException('Usuário já existe');
    }

    const roleFinal = role || 'USUARIO';

    if ((roleFinal === 'USUARIO' || roleFinal === 'ADMIN_SETOR') && !setor) {
      throw new BadRequestException(
        'O campo "setor" é obrigatório para este perfil',
      );
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        senha: senhaHash,
        role: roleFinal,
        setor,
        ultimaTrocaSenha: new Date(),
      },
    });

    const {
      senha: _,
      resetToken: __,
      resetTokenExpiry: ___,
      ...result
    } = usuario;
    return result;
  }

  async getProfile(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        setor: true,
        ativo: true,
        ultimaTrocaSenha: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async trocarSenha(userId: string, dto: TrocarSenhaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const senhaValida = await bcrypt.compare(dto.senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        senha: novaSenhaHash,
        ultimaTrocaSenha: new Date(),
      },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  async recuperarSenha(dto: RecuperarSenhaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    // Não revela se o e-mail existe ou não, por segurança.
    if (!usuario) {
      return {
        message: 'Se o e-mail existir, um link de recuperação foi enviado.',
      };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + RESET_TOKEN_VALIDADE_MS);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER || EMAIL_CONTATO;
    const pass = process.env.SMTP_PASS;
    if (!pass) {
      throw new ServiceUnavailableException('O serviço de e-mail não está configurado.');
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || EMAIL_CONTATO,
      to: usuario.email,
      subject: '[Radar 2030] Definição de nova senha',
      text: [
        'Use o token abaixo para definir uma nova senha. Ele é válido por 1 hora.',
        '',
        token,
      ].join('\n'),
    });

    return { message: 'Se o e-mail existir, um link de recuperação foi enviado.' };
  }

  async redefinirSenha(dto: RedefinirSenhaDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { resetToken: dto.token },
    });

    if (!usuario || !usuario.resetTokenExpiry) {
      throw new BadRequestException('Token de recuperação inválido');
    }

    if (usuario.resetTokenExpiry.getTime() < Date.now()) {
      throw new BadRequestException('Token de recuperação expirado');
    }

    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senha: novaSenhaHash,
        ultimaTrocaSenha: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      message: 'Senha redefinida com sucesso. Faça login com a nova senha.',
    };
  }
}
