import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';
import { gerarTokenSenha } from '../../common/utils/reset-token';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '@prisma/client';

// Token de criação de senha de novos usuários vale por 48 horas.
const CONVITE_VALIDADE_HORAS = 48;

interface UsuarioLogado {
  id: string;
  role: Role;
  setor?: string | null;
}

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  private readonly selectPadrao = {
    id: true,
    email: true,
    role: true,
    setor: true,
    ativo: true,
    createdAt: true,
    updatedAt: true,
  };

  async findAll(busca: string | undefined, solicitante: UsuarioLogado) {
    const where: any = busca
      ? {
          email: {
            contains: busca,
            mode: 'insensitive' as const,
          },
        }
      : {};

    // ADMIN_SETOR só enxerga usuários do próprio setor.
    if (solicitante.role === Role.ADMIN_SETOR) {
      where.setor = solicitante.setor;
    }

    return this.prisma.usuario.findMany({
      where,
      select: this.selectPadrao,
      orderBy: {
        email: 'asc',
      },
    });
  }

  async findOne(id: string, solicitante: UsuarioLogado) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        ...this.selectPadrao,
        _count: {
          select: {
            matrizesCriadas: true,
            matrizesAvaliadas: true,
          },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (solicitante.role === Role.ADMIN_SETOR && usuario.setor !== solicitante.setor) {
      throw new ForbiddenException('Você só pode visualizar usuários do seu setor');
    }

    return usuario;
  }

  async create(createUsuarioDto: CreateUsuarioDto, solicitante: UsuarioLogado) {
    const { email, senha, setor } = createUsuarioDto;
    let { role } = createUsuarioDto;
    role = role || Role.USUARIO;

    // ADMIN_SETOR não pode criar ADMIN_GERAL nem outro ADMIN_SETOR de outro setor.
    if (solicitante.role === Role.ADMIN_SETOR) {
      if (role === Role.ADMIN_GERAL) {
        throw new ForbiddenException('Admin de setor não pode criar um Admin Geral');
      }
    }

    const setorFinal =
      solicitante.role === Role.ADMIN_SETOR ? solicitante.setor : setor;

    if ((role === Role.USUARIO || role === Role.ADMIN_SETOR) && !setorFinal) {
      throw new BadRequestException('O campo "setor" é obrigatório para este perfil');
    }

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      throw new ConflictException('E-mail já cadastrado');
    }

    // Sem senha informada: conta nasce com senha aleatória (ninguém a conhece) e o
    // usuário define a própria senha pelo token enviado por e-mail.
    const enviarConvite = !senha;
    const senhaHash = await bcrypt.hash(senha ?? crypto.randomBytes(32).toString('hex'), 10);
    const convite = enviarConvite ? gerarTokenSenha() : null;

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        senha: senhaHash,
        role,
        setor: setorFinal,
        ultimaTrocaSenha: new Date(),
        ...(convite && {
          resetToken: convite.hash,
          resetTokenExpiry: new Date(Date.now() + CONVITE_VALIDADE_HORAS * 60 * 60 * 1000),
        }),
      },
      select: this.selectPadrao,
    });

    if (!convite) return usuario;

    const conviteEnviado = await this.mailService.enviarTokenSenha(
      email,
      convite.token,
      'convite',
      CONVITE_VALIDADE_HORAS,
    );

    // conviteEnviado=false: o usuário foi criado, mas o e-mail falhou; ele pode usar
    // "Esqueci minha senha" para receber um novo token.
    return {
      ...usuario,
      conviteEnviado,
      ...(this.mailService.modoConsole && { tokenConvite: convite.token }),
    };
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto, solicitante: UsuarioLogado) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (solicitante.role === Role.ADMIN_SETOR && usuario.setor !== solicitante.setor) {
      throw new ForbiddenException('Você só pode editar usuários do seu setor');
    }

    const data: any = {};

    if (updateUsuarioDto.email) {
      const emailExistente = await this.prisma.usuario.findUnique({
        where: { email: updateUsuarioDto.email },
      });

      if (emailExistente && emailExistente.id !== id) {
        throw new ConflictException('E-mail já está em uso');
      }

      data.email = updateUsuarioDto.email;
    }

    if (updateUsuarioDto.senha) {
      data.senha = await bcrypt.hash(updateUsuarioDto.senha, 10);
      data.ultimaTrocaSenha = new Date();
    }

    if (updateUsuarioDto.setor !== undefined) {
      data.setor = updateUsuarioDto.setor;
    }

    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data,
      select: this.selectPadrao,
    });

    return usuarioAtualizado;
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto, solicitante: UsuarioLogado) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (solicitante.role === Role.ADMIN_SETOR) {
      if (usuario.setor !== solicitante.setor) {
        throw new ForbiddenException('Você só pode alterar usuários do seu setor');
      }
      if (updateRoleDto.role === Role.ADMIN_GERAL) {
        throw new ForbiddenException('Admin de setor não pode promover a Admin Geral');
      }
    }

    if (!Object.values(Role).includes(updateRoleDto.role)) {
      throw new BadRequestException('Perfil inválido');
    }

    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        role: updateRoleDto.role,
      },
      select: this.selectPadrao,
    });

    return usuarioAtualizado;
  }

  async desativar(id: string, solicitante: UsuarioLogado) {
    return this.alterarStatus(id, false, solicitante);
  }

  async ativar(id: string, solicitante: UsuarioLogado) {
    return this.alterarStatus(id, true, solicitante);
  }

  private async alterarStatus(id: string, ativo: boolean, solicitante: UsuarioLogado) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (solicitante.role === Role.ADMIN_SETOR && usuario.setor !== solicitante.setor) {
      throw new ForbiddenException('Você só pode ativar/desativar usuários do seu setor');
    }

    if (usuario.id === solicitante.id) {
      throw new BadRequestException('Você não pode ativar/desativar a própria conta');
    }

    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data: { ativo },
      select: this.selectPadrao,
    });

    return usuarioAtualizado;
  }

  async remove(id: string, solicitante: UsuarioLogado) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (solicitante.role === Role.ADMIN_SETOR && usuario.setor !== solicitante.setor) {
      throw new ForbiddenException('Você só pode remover usuários do seu setor');
    }

    const matrizes = await this.prisma.matriz.count({
      where: {
        OR: [{ criadoPorId: id }, { avaliadoPorId: id }],
      },
    });

    if (matrizes > 0) {
      throw new BadRequestException(
        'Não é possível remover usuário com matrizes vinculadas. Use desativar em vez de remover.',
      );
    }

    await this.prisma.usuario.delete({
      where: { id },
    });

    return { message: 'Usuário removido com sucesso' };
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }
}
