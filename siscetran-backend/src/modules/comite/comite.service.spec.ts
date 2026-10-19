import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ComiteService } from './comite.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { Status } from '@prisma/client';

describe('ComiteService', () => {
  let service: ComiteService;
  let prisma: any;
  let logsService: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      matriz: { findUnique: jest.fn() },
      matrizRevisao: { findFirst: jest.fn(), findMany: jest.fn() },
      voto: { upsert: jest.fn() },
    };
    logsService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComiteService,
        { provide: PrismaService, useValue: prisma },
        { provide: LogsService, useValue: logsService },
      ],
    }).compile();

    service = module.get<ComiteService>(ComiteService);
  });

  it('faz upsert do voto na revisão atual com o usuário autenticado', async () => {
    prisma.matriz.findUnique.mockResolvedValue({
      id: 'matriz-1',
      status: Status.ENVIADO,
    });
    prisma.matrizRevisao.findFirst.mockResolvedValue({
      id: 'revisao-2',
      numero: 2,
    });
    prisma.voto.upsert.mockResolvedValue({
      id: 'voto-1',
      revisaoId: 'revisao-2',
      usuarioId: 'user-1',
    });

    await service.votar(
      'matriz-1',
      { voto: 'APROVAR', comentario: 'Parecer' },
      'user-1',
    );

    expect(prisma.voto.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          revisaoId_usuarioId: { revisaoId: 'revisao-2', usuarioId: 'user-1' },
        },
      }),
    );
  });

  it('rejeita voto quando a matriz não está enviada', async () => {
    prisma.matriz.findUnique.mockResolvedValue({
      id: 'matriz-1',
      status: Status.PENDENTE,
    });

    await expect(
      service.votar('matriz-1', { voto: 'APROVAR' }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('carrega somente a revisão atual nas listagens do Comitê', async () => {
    prisma.matriz.findMany = jest.fn().mockResolvedValue([
      {
        id: 'matriz-1',
        revisoes: [
          {
            id: 'revisao-2',
            numero: 2,
            votos: [{ id: 'voto-2', revisaoId: 'revisao-2' }],
          },
        ],
      },
    ]);

    const matrizes = await service.getPendentes();

    expect(prisma.matriz.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          revisoes: expect.objectContaining({
            orderBy: { numero: 'desc' },
            take: 1,
          }),
        }),
      }),
    );
    expect(matrizes[0].votos).toEqual([
      { id: 'voto-2', revisaoId: 'revisao-2' },
    ]);
    expect(matrizes[0].revisoes).toBeUndefined();
  });

  it('retorna a matriz e todas as revisões com seus votos', async () => {
    const matriz = {
      id: 'matriz-1',
      status: Status.ENVIADO,
      criadoPorId: 'user-1',
      criadoPor: { setor: 'Planejamento' },
    };
    prisma.matriz.findUnique.mockResolvedValue(matriz);
    prisma.matrizRevisao.findMany.mockResolvedValue([
      {
        id: 'revisao-1',
        numero: 1,
        votos: [{ id: 'voto-1', revisaoId: 'revisao-1' }],
      },
      {
        id: 'revisao-2',
        numero: 2,
        votos: [{ id: 'voto-2', revisaoId: 'revisao-2' }],
      },
    ]);

    await expect(
      service.getHistorico('matriz-1', {
        id: 'user-1',
        role: 'USUARIO' as const,
      }),
    ).resolves.toEqual({
      matriz,
      revisoes: expect.any(Array),
    });
    expect(prisma.matrizRevisao.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { matrizId: 'matriz-1' },
      }),
    );
  });

  it('bloqueia usuário sem permissão para visualizar o histórico', async () => {
    prisma.matriz.findUnique.mockResolvedValue({
      id: 'matriz-1',
      criadoPorId: 'outro-usuario',
      criadoPor: { setor: 'Planejamento' },
    });

    await expect(
      service.getHistorico('matriz-1', {
        id: 'user-1',
        role: 'USUARIO' as const,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
