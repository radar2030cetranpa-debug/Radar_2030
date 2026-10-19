import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Status } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKpis() {
    const total = await this.prisma.matriz.count();
    const aprovados = await this.prisma.matriz.count({
      where: { status: Status.APROVADO },
    });
    const pendentes = await this.prisma.matriz.count({
      where: { status: Status.PENDENTE },
    });
    const enviados = await this.prisma.matriz.count({
      where: { status: Status.ENVIADO },
    });
    const rascunhos = await this.prisma.matriz.count({
      where: { status: Status.RASCUNHO },
    });

    const resultado = await this.prisma.matriz.aggregate({
      _avg: { percentual: true },
    });

    const percentualMedio = Math.round(resultado._avg.percentual || 0);

    return {
      total,
      aprovados,
      pendentes,
      enviados,
      rascunhos,
      percentualMedio,
    };
  }

  async getGraficos() {
    const statusData = await this.prisma.matriz.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const setorData = await this.prisma.acoesMatriz.groupBy({
      by: ['acaoId'],
      _count: { acaoId: true },
      orderBy: { _count: { acaoId: 'desc' } },
      take: 10,
    });

    const prazoData = await this.prisma.acao.groupBy({
      by: ['prazo'],
      _count: { prazo: true },
    });

    const impactoData = await this.prisma.matriz.groupBy({
      by: ['impacto'],
      _count: { impacto: true },
    });

    const meses = await this.prisma.$queryRaw`
      SELECT
        DATE_TRUNC('month', "dataCriacao") as mes,
        COUNT(*) as total
      FROM "Matriz"
      WHERE "dataCriacao" >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', "dataCriacao")
      ORDER BY mes ASC
    `;

    return {
      status: statusData,
      setor: setorData,
      prazo: prazoData,
      impacto: impactoData,
      evolucaoMensal: meses,
    };
  }

  async getResumo() {
    const [kpis, graficos, ultimasMatrizes] = await Promise.all([
      this.getKpis(),
      this.getGraficos(),
      this.getUltimasMatrizes(10),
    ]);

    return { kpis, graficos, ultimasMatrizes };
  }

  async getUltimasMatrizes(limit: number = 10) {
    return this.prisma.matriz.findMany({
      take: limit,
      orderBy: { dataCriacao: 'desc' },
      include: {
        criadoPor: { select: { id: true, email: true } },
        acoes: { include: { acao: true } },
      },
    });
  }

  async getMatrizesAprovadas() {
    return this.prisma.matriz.findMany({
      where: { status: Status.APROVADO },
      include: {
        criadoPor: { select: { id: true, email: true } },
        avaliadoPor: { select: { id: true, email: true } },
        acoes: { include: { acao: true } },
      },
      orderBy: { dataAvaliacao: 'desc' },
    });
  }
}
