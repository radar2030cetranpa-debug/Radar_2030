import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAcaoDto } from './dto/create-acao.dto';
import { UpdateAcaoDto } from './dto/update-acao.dto';
import { Prazo } from '@prisma/client';

@Injectable()
export class AcoesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: {
    busca?: string;
    og?: string;
    lae?: string;
    setor?: string;
    prazo?: string;
  }) {
    const where: any = {};

    if (filters?.busca) {
      where.OR = [
        { id: { contains: filters.busca, mode: 'insensitive' as const } },
        { diretriz: { contains: filters.busca, mode: 'insensitive' as const } },
        { setor: { contains: filters.busca, mode: 'insensitive' as const } },
        {
          responsavel: {
            contains: filters.busca,
            mode: 'insensitive' as const,
          },
        },
      ];
    }

    if (filters?.og) {
      where.og = { contains: filters.og, mode: 'insensitive' as const };
    }

    if (filters?.lae) {
      where.lae = { contains: filters.lae, mode: 'insensitive' as const };
    }

    if (filters?.setor) {
      where.setor = { contains: filters.setor, mode: 'insensitive' as const };
    }

    if (filters?.prazo) {
      where.prazo = filters.prazo as Prazo;
    }

    return this.prisma.acao.findMany({
      where,
      orderBy: {
        linhaPlanilha: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const acao = await this.prisma.acao.findUnique({
      where: { id },
      include: {
        matrizes: {
          include: {
            matriz: {
              select: {
                id: true,
                nome: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!acao) {
      throw new NotFoundException('Ação não encontrada');
    }

    return acao;
  }

  async create(createAcaoDto: CreateAcaoDto) {
    const acaoExistente = await this.prisma.acao.findUnique({
      where: { id: createAcaoDto.id },
    });

    if (acaoExistente) {
      throw new ConflictException(`Ação com ID ${createAcaoDto.id} já existe`);
    }

    return this.prisma.acao.create({
      data: {
        ...createAcaoDto,
        dadosIncompletos: createAcaoDto.dadosIncompletos || [],
      },
    });
  }

  async update(id: string, updateAcaoDto: UpdateAcaoDto) {
    const acao = await this.prisma.acao.findUnique({ where: { id } });

    if (!acao) {
      throw new NotFoundException('Ação não encontrada');
    }

    return this.prisma.acao.update({
      where: { id },
      data: {
        ...updateAcaoDto,
        dadosIncompletos: updateAcaoDto.dadosIncompletos,
      },
    });
  }

  async remove(id: string) {
    const acao = await this.prisma.acao.findUnique({
      where: { id },
      include: { matrizes: true },
    });

    if (!acao) {
      throw new NotFoundException('Ação não encontrada');
    }

    if (acao.matrizes.length > 0) {
      throw new BadRequestException(
        'Ação está vinculada a uma ou mais matrizes e não pode ser removida',
      );
    }

    await this.prisma.acao.delete({ where: { id } });

    return { message: 'Ação removida com sucesso' };
  }

  async importar(acoes: CreateAcaoDto[]) {
    const resultados = {
      sucesso: 0,
      erro: 0,
      erros: [] as string[],
    };

    for (const acao of acoes) {
      try {
        await this.create(acao);
        resultados.sucesso++;
      } catch (error) {
        resultados.erro++;
        resultados.erros.push(`Erro ao importar ${acao.id}: ${error.message}`);
      }
    }

    return resultados;
  }
}
