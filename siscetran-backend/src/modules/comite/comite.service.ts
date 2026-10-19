import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { AvaliarMatrizDto } from '../matrizes/dto/avaliar-matriz.dto';
import { VotarMatrizDto } from '../matrizes/dto/votar-matriz.dto';
import { Role, Status } from '@prisma/client';

interface UsuarioLogado {
  id: string;
  role: Role;
  setor?: string | null;
}

@Injectable()
export class ComiteService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  private readonly includeMatriz = {
    criadoPor: { select: { id: true, email: true, setor: true } },
    avaliadoPor: { select: { id: true, email: true } },
    acoes: { include: { acao: true } },
  };

  private readonly includeComVotosAtuais = {
    ...this.includeMatriz,
    revisoes: {
      orderBy: { numero: 'desc' as const },
      take: 1,
      include: {
        votos: {
          include: {
            usuario: { select: { id: true, email: true, role: true } },
          },
        },
      },
    },
  };

  private comVotosAtuais(matriz: any) {
    const { revisoes, ...dadosMatriz } = matriz;
    return {
      ...dadosMatriz,
      votos: revisoes?.[0]?.votos ?? [],
    };
  }

  async getPendentes() {
    const matrizes = await this.prisma.matriz.findMany({
      where: { status: Status.ENVIADO },
      include: this.includeComVotosAtuais,
      orderBy: { dataCriacao: 'asc' },
    });

    return matrizes.map((matriz) => this.comVotosAtuais(matriz));
  }

  async getEstatisticas() {
    const total = await this.prisma.matriz.count();
    const enviados = await this.prisma.matriz.count({
      where: { status: Status.ENVIADO },
    });
    const aprovados = await this.prisma.matriz.count({
      where: { status: Status.APROVADO },
    });
    const pendentes = await this.prisma.matriz.count({
      where: { status: Status.PENDENTE },
    });
    const rascunhos = await this.prisma.matriz.count({
      where: { status: Status.RASCUNHO },
    });

    const resultado: Array<{ media_dias: number | null }> = await this.prisma
      .$queryRaw`
      SELECT
        AVG(EXTRACT(DAY FROM ("dataAvaliacao" - "dataCriacao"))) as media_dias
      FROM "Matriz"
      WHERE "dataAvaliacao" IS NOT NULL
    `;

    const mediaDias = resultado[0]?.media_dias || 0;

    return {
      total,
      enviados,
      aprovados,
      pendentes,
      rascunhos,
      mediaDiasAvaliacao: Math.round(Number(mediaDias)),
    };
  }

  async getMatrizes(status?: Status) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const matrizes = await this.prisma.matriz.findMany({
      where,
      include: this.includeComVotosAtuais,
      orderBy: { dataCriacao: 'desc' },
    });

    return matrizes.map((matriz) => this.comVotosAtuais(matriz));
  }

  async getMatriz(id: string) {
    const matriz = await this.prisma.matriz.findUnique({
      where: { id },
      include: this.includeComVotosAtuais,
    });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    return this.comVotosAtuais(matriz);
  }

  /**
   * Registro de voto consultivo de um Conselheiro/Admin Geral.
   */
  async votar(id: string, votarMatrizDto: VotarMatrizDto, usuarioId: string) {
    const matriz = await this.prisma.matriz.findUnique({ where: { id } });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    if (matriz.status !== Status.ENVIADO) {
      throw new BadRequestException(
        'Apenas matrizes enviadas podem receber votos',
      );
    }

    const revisao = await this.prisma.matrizRevisao.findFirst({
      where: { matrizId: id },
      orderBy: { numero: 'desc' },
    });

    if (!revisao) {
      throw new BadRequestException(
        'Não existe revisão ativa para esta matriz',
      );
    }

    const voto = await this.prisma.voto.upsert({
      where: {
        revisaoId_usuarioId: { revisaoId: revisao.id, usuarioId },
      },
      update: {
        matrizId: id,
        voto: votarMatrizDto.voto,
        comentario: votarMatrizDto.comentario,
      },
      create: {
        matrizId: id,
        revisaoId: revisao.id,
        usuarioId,
        voto: votarMatrizDto.voto,
        comentario: votarMatrizDto.comentario,
      },
      include: {
        usuario: { select: { id: true, email: true, role: true } },
      },
    });

    await this.logsService.create({
      usuarioId,
      acao: 'VOTAR_MATRIZ',
      detalhes: `Votou "${votarMatrizDto.voto}" na matriz ${id} na revisão ${revisao.numero}`,
    });

    return voto;
  }

  /**
   * Decisão final — restrita a Admin Geral pelo controller.
   */
  async avaliar(
    id: string,
    avaliarMatrizDto: AvaliarMatrizDto,
    userId: string,
  ) {
    const matriz = await this.prisma.matriz.findUnique({ where: { id } });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    if (matriz.status !== Status.ENVIADO) {
      throw new BadRequestException(
        'Apenas matrizes enviadas podem ser avaliadas',
      );
    }

    const matrizAtualizada = await this.prisma.matriz.update({
      where: { id },
      data: {
        status: avaliarMatrizDto.status,
        comentarioComite: avaliarMatrizDto.comentario,
        avaliadoPorId: userId,
        dataAvaliacao: new Date(),
      },
      include: this.includeComVotosAtuais,
    });

    await this.logsService.create({
      usuarioId: userId,
      acao: 'AVALIAR_MATRIZ_COMITE',
      detalhes: `Matriz ${matrizAtualizada.id} - ${matrizAtualizada.nome} avaliada como ${avaliarMatrizDto.status}`,
    });

    return this.comVotosAtuais(matrizAtualizada);
  }

  async getHistorico(id: string, solicitante: UsuarioLogado) {
    const matriz = await this.prisma.matriz.findUnique({
      where: { id },
      include: this.includeMatriz,
    });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    if (
      solicitante.role === Role.USUARIO &&
      matriz.criadoPorId !== solicitante.id
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar esta matriz',
      );
    }

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      matriz.criadoPor?.setor !== solicitante.setor
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar esta matriz',
      );
    }

    const revisoes = await this.prisma.matrizRevisao.findMany({
      where: { matrizId: id },
      orderBy: { numero: 'asc' },
      include: {
        votos: {
          include: {
            usuario: { select: { id: true, email: true, role: true } },
          },
        },
      },
    });

    return { matriz, revisoes };
  }
}
