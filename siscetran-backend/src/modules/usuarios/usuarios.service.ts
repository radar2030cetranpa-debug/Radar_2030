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
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from '@prisma/client';

interface UsuarioLogado {
  id: string;
  role: Role;
  setor?: string | null;
}

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

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

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      usuario.setor !== solicitante.setor
    ) {
      throw new ForbiddenException(
        'Você só pode visualizar usuários do seu setor',
      );
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
        throw new ForbiddenException(
          'Admin de setor não pode criar um Admin Geral',
        );
      }
    }

    const setorFinal =
      solicitante.role === Role.ADMIN_SETOR ? solicitante.setor : setor;

    if ((role === Role.USUARIO || role === Role.ADMIN_SETOR) && !setorFinal) {
      throw new BadRequestException(
        'O campo "setor" é obrigatório para este perfil',
      );
    }

    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const senhaFinal = senha || crypto.randomBytes(16).toString('hex') + 'A1!';
    const senhaHash = await bcrypt.hash(senhaFinal, 10);
    const resetToken = !senha ? crypto.randomBytes(32).toString('hex') : null;
    const resetTokenExpiry = !senha
      ? new Date(Date.now() + 48 * 60 * 60 * 1000)
      : null;

    const usuario = await this.prisma.usuario.create({
      data: {
        email,
        senha: senhaHash,
        role,
        setor: setorFinal,
        resetToken,
        resetTokenExpiry,
        ultimaTrocaSenha: new Date(),
      },
      select: {
        ...this.selectPadrao,
        resetToken: true,
      },
    });

    if (resetToken) {
      console.log(
        `[CONVITE / PRIMEIRO ACESSO] Link de definição de senha para ${usuario.email}: /?token=${resetToken}#definir-senha`,
      );
    }

    return usuario;
  }

  async update(
    id: string,
    updateUsuarioDto: UpdateUsuarioDto,
    solicitante: UsuarioLogado,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      usuario.setor !== solicitante.setor
    ) {
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

  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
    solicitante: UsuarioLogado,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (solicitante.role === Role.ADMIN_SETOR) {
      if (usuario.setor !== solicitante.setor) {
        throw new ForbiddenException(
          'Você só pode alterar usuários do seu setor',
        );
      }
      if (updateRoleDto.role === Role.ADMIN_GERAL) {
        throw new ForbiddenException(
          'Admin de setor não pode promover a Admin Geral',
        );
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

  private async alterarStatus(
    id: string,
    ativo: boolean,
    solicitante: UsuarioLogado,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      usuario.setor !== solicitante.setor
    ) {
      throw new ForbiddenException(
        'Você só pode ativar/desativar usuários do seu setor',
      );
    }

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      usuario.role === Role.ADMIN_GERAL
    ) {
      throw new ForbiddenException(
        'Admin de setor não pode ativar/desativar um Admin Geral',
      );
    }

    if (usuario.id === solicitante.id) {
      throw new BadRequestException(
        'Você não pode ativar/desativar a própria conta',
      );
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

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      usuario.setor !== solicitante.setor
    ) {
      throw new ForbiddenException(
        'Você só pode remover usuários do seu setor',
      );
    }

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      usuario.role === Role.ADMIN_GERAL
    ) {
      throw new ForbiddenException(
        'Admin de setor não pode remover um Admin Geral',
      );
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
