import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { CreateMatrizDto } from './dto/create-matriz.dto';
import { UpdateMatrizDto } from './dto/update-matriz.dto';
import { AvaliarMatrizDto } from './dto/avaliar-matriz.dto';
import { VotarMatrizDto } from './dto/votar-matriz.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';
import { Status, Role, Prisma } from '@prisma/client';

interface UsuarioLogado {
  id: string;
  role: Role;
  setor?: string | null;
}

function gerarIdMatriz(): string {
  const letras = Array.from({ length: 3 }, () => {
    const codigo = 65 + Math.floor(Math.random() * 26);
    return String.fromCharCode(codigo);
  }).join('');
  const numeros = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');

  return `${letras}${numeros}`;
}

/**
 * Garante o formato Etapa -> Tarefas (5W2H por tarefa) antes de gravar o JSON.
 * Etapas legadas (sem "tarefas") continuam aceitas.
 */
function validarEtapas(etapas: unknown[] | undefined): unknown[] {
  const lista = etapas ?? [];
  for (const etapa of lista) {
    if (!etapa || typeof etapa !== 'object' || Array.isArray(etapa)) {
      throw new BadRequestException('Etapa inválida');
    }
    const { tarefas } = etapa as { tarefas?: unknown };
    if (tarefas === undefined) continue;
    if (
      !Array.isArray(tarefas) ||
      tarefas.some((t) => !t || typeof t !== 'object' || Array.isArray(t))
    ) {
      throw new BadRequestException('As tarefas da etapa são inválidas');
    }
  }
  return lista;
}

@Injectable()
export class MatrizesService {
  constructor(
    private prisma: PrismaService,
    private logsService: LogsService,
  ) {}

  private readonly includeCompleto = {
    criadoPor: { select: { id: true, email: true, setor: true } },
    avaliadoPor: { select: { id: true, email: true } },
    acoes: { include: { acao: true } },
    votos: {
      include: { usuario: { select: { id: true, email: true, role: true } } },
    },
  };

  private async obterRevisaoAtual(matrizId: string) {
    const revisao = await this.prisma.matrizRevisao.findFirst({
      where: { matrizId },
      orderBy: { numero: 'desc' },
    });

    if (!revisao) {
      throw new BadRequestException(
        'Não existe revisão ativa para esta matriz',
      );
    }

    return revisao;
  }

  async findAll(
    status: Status | undefined,
    solicitante: UsuarioLogado,
    usuarioId?: string,
  ) {
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // USUARIO: apenas as próprias.
    if (solicitante.role === Role.USUARIO) {
      where.criadoPorId = solicitante.id;
    }

    // ADMIN_SETOR: apenas as do próprio setor.
    if (solicitante.role === Role.ADMIN_SETOR) {
      where.criadoPor = { setor: solicitante.setor };
    }

    // COMITE e ADMIN_GERAL enxergam todas; filtro opcional por usuário criador.
    if (
      usuarioId &&
      (solicitante.role === Role.COMITE ||
        solicitante.role === Role.ADMIN_GERAL)
    ) {
      where.criadoPorId = usuarioId;
    }

    return this.prisma.matriz.findMany({
      where,
      include: this.includeCompleto,
      orderBy: {
        dataCriacao: 'desc',
      },
    });
  }

  async findOne(id: string, solicitante: UsuarioLogado) {
    const matriz = await this.prisma.matriz.findUnique({
      where: { id },
      include: this.includeCompleto,
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
      matriz.criadoPor.setor !== solicitante.setor
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar esta matriz',
      );
    }

    return matriz;
  }

  async create(createMatrizDto: CreateMatrizDto, userId: string) {
    const { acoes, ...dados } = createMatrizDto;

    if (acoes && acoes.length > 0) {
      const acoesIds = acoes.map((a) => a.acaoId);
      const acoesExistentes = await this.prisma.acao.findMany({
        where: { id: { in: acoesIds } },
      });

      if (acoesExistentes.length !== acoesIds.length) {
        throw new BadRequestException('Uma ou mais ações não existem');
      }
    }

    const matriz = await this.prisma.matriz.create({
      data: {
        id: gerarIdMatriz(),
        ...dados,
        criadoPorId: userId,
        acoes:
          acoes && acoes.length > 0
            ? {
                create: acoes.map((a) => ({
                  acaoId: a.acaoId,
                  etapas: validarEtapas(a.etapas) as Prisma.InputJsonValue,
                })),
              }
            : undefined,
      },
      include: this.includeCompleto,
    });

    await this.logsService.create({
      usuarioId: userId,
      acao: 'CRIAR_MATRIZ',
      detalhes: `Criou a matriz ${matriz.id} - ${matriz.nome}`,
    });

    return matriz;
  }

  private async verificarPermissaoEdicao(
    matrizId: string,
    solicitante: UsuarioLogado,
  ) {
    const matriz = await this.prisma.matriz.findUnique({
      where: { id: matrizId },
      include: { criadoPor: { select: { setor: true } } },
    });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    if (
      solicitante.role === Role.USUARIO &&
      matriz.criadoPorId !== solicitante.id
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para editar esta matriz',
      );
    }

    if (
      solicitante.role === Role.ADMIN_SETOR &&
      matriz.criadoPor.setor !== solicitante.setor
    ) {
      throw new ForbiddenException('Você só pode editar matrizes do seu setor');
    }

    return matriz;
  }

  async update(
    id: string,
    updateMatrizDto: UpdateMatrizDto,
    solicitante: UsuarioLogado,
  ) {
    const matriz = await this.verificarPermissaoEdicao(id, solicitante);

    if (
      matriz.status === Status.APROVADO &&
      solicitante.role !== Role.ADMIN_GERAL
    ) {
      throw new ForbiddenException(
        'Somente Admin Geral pode editar matrizes aprovadas pelo Comitê Gestor',
      );
    }

    if (matriz.status === Status.ENVIADO) {
      throw new BadRequestException(
        'Matriz já enviada não pode ser editada',
      );
    }

    const { acoes, ...dados } = updateMatrizDto;

    // Valida tudo ANTES de mexer no banco: se algo estiver errado, nada é apagado.
    let acoesUpdate:
      | { create: { acaoId: string; etapas: Prisma.InputJsonValue }[] }
      | undefined = undefined;
    if (acoes) {
      const novas = acoes.map((a) => ({
        acaoId: a.acaoId,
        etapas: validarEtapas(a.etapas) as Prisma.InputJsonValue,
      }));

      const ids = [...new Set(novas.map((a) => a.acaoId))];
      if (ids.length > 0) {
        const existentes = await this.prisma.acao.count({
          where: { id: { in: ids } },
        });
        if (existentes !== ids.length) {
          throw new BadRequestException('Uma ou mais ações não existem');
        }
      }

      acoesUpdate = { create: novas };
    }

    // Apagar as ações antigas e gravar as novas na mesma transação: se a gravação
    // falhar, a matriz continua com as ações que já tinha.
    const matrizAtualizada = await this.prisma.$transaction(async (tx) => {
      if (acoesUpdate) {
        await tx.acoesMatriz.deleteMany({ where: { matrizId: id } });
      }
      return tx.matriz.update({
        where: { id },
        data: { ...dados, acoes: acoesUpdate },
        include: this.includeCompleto,
      });
    });

    await this.logsService.create({
      usuarioId: solicitante.id,
      acao: 'ATUALIZAR_MATRIZ',
      detalhes: `Atualizou a matriz ${matrizAtualizada.id} - ${matrizAtualizada.nome}`,
    });

    return matrizAtualizada;
  }

  async remove(id: string, solicitante: UsuarioLogado) {
    const matriz = await this.verificarPermissaoEdicao(id, solicitante);

    if (
      matriz.status === Status.APROVADO &&
      solicitante.role !== Role.ADMIN_GERAL
    ) {
      throw new ForbiddenException(
        'Somente Admin Geral pode excluir matrizes aprovadas pelo Comitê Gestor',
      );
    }

    if (matriz.status === Status.ENVIADO) {
      throw new BadRequestException(
        'Matriz já enviada não pode ser removida',
      );
    }

    await this.prisma.acoesMatriz.deleteMany({ where: { matrizId: id } });
    await this.prisma.matriz.delete({ where: { id } });

    await this.logsService.create({
      usuarioId: solicitante.id,
      acao: 'REMOVER_MATRIZ',
      detalhes: `Removeu a matriz ${matriz.id} - ${matriz.nome}`,
    });

    return { message: 'Matriz removida com sucesso' };
  }

  async enviarParaComite(id: string, userId: string) {
    const matriz = await this.prisma.matriz.findUnique({ where: { id } });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    if (matriz.criadoPorId !== userId) {
      throw new ForbiddenException(
        'Você só pode enviar suas próprias matrizes',
      );
    }

    if (matriz.status === Status.ENVIADO) {
      throw new BadRequestException('Matriz já foi enviada');
    }

    if (matriz.status === Status.APROVADO) {
      throw new BadRequestException('Matriz já foi aprovada');
    }

    const revisaoAtual = await this.prisma.matrizRevisao.findFirst({
      where: { matrizId: id },
      orderBy: { numero: 'desc' },
      include: { _count: { select: { votos: true } } },
    });

    const proximoNumero = revisaoAtual ? revisaoAtual.numero + 1 : 1;

    if (matriz.status === Status.PENDENTE) {
      // Reenvio real após pendência: sempre cria uma nova revisão.
      await this.prisma.matrizRevisao.create({
        data: {
          matrizId: id,
          numero: proximoNumero,
          criadoPorId: userId,
        },
      });
    } else if (
      matriz.status === Status.RASCUNHO &&
      (!revisaoAtual || revisaoAtual._count.votos === 0)
    ) {
      // Primeira submissão real. Se já existe uma revisão vazia (ex: placeholder
      // criado pelo backfill de migração para matrizes antigas), reaproveita ela
      // em vez de criar uma segunda revisão sem voto nenhum.
      if (!revisaoAtual) {
        await this.prisma.matrizRevisao.create({
          data: {
            matrizId: id,
            numero: 1,
            criadoPorId: userId,
          },
        });
      }
    }

    const numeroRevisaoFinal =
      matriz.status === Status.RASCUNHO &&
      revisaoAtual &&
      revisaoAtual._count.votos === 0
        ? revisaoAtual.numero
        : proximoNumero;

    const matrizAtualizada = await this.prisma.matriz.update({
      where: { id },
      data: { status: Status.ENVIADO },
      include: this.includeCompleto,
    });

    await this.logsService.create({
      usuarioId: userId,
      acao: 'ENVIAR_MATRIZ',
      detalhes: `Enviou a matriz ${matrizAtualizada.id} - ${matrizAtualizada.nome} ao Comitê Gestor (revisão ${numeroRevisaoFinal})`,
    });

    return matrizAtualizada;
  }

  /**
   * Registro de voto de um Conselheiro (COMITE) ou Admin Geral.
   * Não decide o status da matriz — é apenas um registro consultivo,
   * visível para o Admin Geral na hora da decisão final.
   */
  async votar(
    id: string,
    votarMatrizDto: VotarMatrizDto,
    solicitante: UsuarioLogado,
  ) {
    const matriz = await this.prisma.matriz.findUnique({ where: { id } });

    if (!matriz) {
      throw new NotFoundException('Matriz não encontrada');
    }

    if (matriz.status !== Status.ENVIADO) {
      throw new BadRequestException(
        'Apenas matrizes enviadas podem receber votos',
      );
    }

    const revisao = await this.obterRevisaoAtual(id);

    const voto = await this.prisma.voto.upsert({
      where: {
        revisaoId_usuarioId: {
          revisaoId: revisao.id,
          usuarioId: solicitante.id,
        },
      },
      update: {
        matrizId: id,
        voto: votarMatrizDto.voto,
        comentario: votarMatrizDto.comentario,
      },
      create: {
        matrizId: id,
        revisaoId: revisao.id,
        usuarioId: solicitante.id,
        voto: votarMatrizDto.voto,
        comentario: votarMatrizDto.comentario,
      },
      include: {
        usuario: { select: { id: true, email: true, role: true } },
      },
    });

    await this.logsService.create({
      usuarioId: solicitante.id,
      acao: 'VOTAR_MATRIZ',
      detalhes: `Votou "${votarMatrizDto.voto}" na matriz ${id} na revisão ${revisao.numero}`,
    });

    return voto;
  }

  /**
   * Decisão final — apenas Admin Geral. Define definitivamente o status
   * da matriz (APROVADO ou PENDENTE), independente da contagem de votos.
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
      include: this.includeCompleto,
    });

    await this.logsService.create({
      usuarioId: userId,
      acao: 'AVALIAR_MATRIZ',
      detalhes: `Avaliou a matriz ${matrizAtualizada.id} - ${matrizAtualizada.nome} como ${avaliarMatrizDto.status}`,
    });

    return matrizAtualizada;
  }

  async atualizarProgresso(
    id: string,
    dto: AtualizarProgressoDto,
    solicitante: UsuarioLogado,
  ) {
    const matriz = await this.verificarPermissaoEdicao(id, solicitante);

    if (solicitante.role !== Role.ADMIN_GERAL) {
      throw new ForbiddenException(
        'Somente Admin Geral pode editar matrizes aprovadas pelo Comitê Gestor',
      );
    }

    if (matriz.status !== Status.APROVADO) {
      throw new BadRequestException(
        'Apenas matrizes aprovadas podem ter seu progresso atualizado',
      );
    }

    if (dto.acoes && dto.acoes.length > 0) {
      for (const item of dto.acoes) {
        await this.prisma.acoesMatriz.upsert({
          where: {
            matrizId_acaoId: {
              matrizId: id,
              acaoId: item.acaoId,
            },
          },
          update: {
            etapas: validarEtapas(item.etapas) as Prisma.InputJsonValue,
          },
          create: {
            matrizId: id,
            acaoId: item.acaoId,
            etapas: validarEtapas(item.etapas) as Prisma.InputJsonValue,
          },
        });
      }
    }

    const matrizAtualizada = await this.prisma.matriz.update({
      where: { id },
      data: {
        percentual: dto.percentual,
      },
      include: this.includeCompleto,
    });

    await this.logsService.create({
      usuarioId: solicitante.id,
      acao: 'ATUALIZAR_PROGRESSO',
      detalhes: `Atualizou o progresso da matriz ${matrizAtualizada.id} - ${matrizAtualizada.nome} para ${dto.percentual}%`,
    });

    return matrizAtualizada;
  }

  async getHistorico(id: string, solicitante: UsuarioLogado) {
    const matriz = await this.findOne(id, solicitante);

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

    return {
      matriz,
      revisoes,
    };
  }
}
