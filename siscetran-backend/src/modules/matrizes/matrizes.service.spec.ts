import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MatrizesService } from './matrizes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LogsService } from '../logs/logs.service';
import { Status } from '@prisma/client';

describe('MatrizesService', () => {
  let service: MatrizesService;
  let prisma: any;
  let logsService: { create: jest.Mock };

  const matrizMock = {
    id: 'matriz-1',
    nome: 'Modernização da Frota',
    status: Status.RASCUNHO,
    criadoPorId: 'user-1',
  };

  beforeEach(async () => {
    prisma = {
      matriz: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    logsService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatrizesService,
        { provide: PrismaService, useValue: prisma },
        { provide: LogsService, useValue: logsService },
      ],
    }).compile();

    service = module.get<MatrizesService>(MatrizesService);
  });

  describe('enviarParaComite', () => {
    it('deve impedir que outro usuário envie uma matriz que não é dele', async () => {
      prisma.matriz.findUnique.mockResolvedValue(matrizMock);

      await expect(
        service.enviarParaComite('matriz-1', 'outro-usuario'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve impedir reenvio de matriz já enviada', async () => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        status: Status.ENVIADO,
      });

      await expect(
        service.enviarParaComite('matriz-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve criar uma revisão inicial ao enviar a matriz pela primeira vez', async () => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        status: Status.RASCUNHO,
        id: 'matriz-1',
      });
      prisma.matriz.update.mockResolvedValue({
        ...matrizMock,
        status: Status.ENVIADO,
      });
      prisma.matrizRevisao = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'revisao-1',
          matrizId: 'matriz-1',
          numero: 1,
        }),
      };

      await service.enviarParaComite('matriz-1', 'user-1');

      expect(prisma.matrizRevisao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matrizId: 'matriz-1',
            numero: 1,
            criadoPorId: 'user-1',
          }),
        }),
      );
    });

    it('deve criar uma nova revisão ao reenviar uma matriz pendente', async () => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        status: Status.PENDENTE,
      });
      prisma.matriz.update.mockResolvedValue({
        ...matrizMock,
        status: Status.ENVIADO,
      });
      prisma.matrizRevisao = {
        findFirst: jest.fn().mockResolvedValue({ id: 'revisao-1', numero: 1 }),
        create: jest.fn().mockResolvedValue({
          id: 'revisao-2',
          matrizId: 'matriz-1',
          numero: 2,
        }),
      };

      await service.enviarParaComite('matriz-1', 'user-1');

      expect(prisma.matrizRevisao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matrizId: 'matriz-1',
            numero: 2,
          }),
        }),
      );
    });
  });

  describe('avaliar', () => {
    it('deve impedir avaliação de matriz que não foi enviada', async () => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        status: Status.RASCUNHO,
      });

      await expect(
        service.avaliar(
          'matriz-1',
          { status: Status.APROVADO, comentario: 'ok' },
          'comite-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('votar', () => {
    const conselheiro = { id: 'conselheiro-1', role: 'COMITE' as const };

    beforeEach(() => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        status: Status.ENVIADO,
      });
      prisma.matrizRevisao = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'revisao-2',
          matrizId: 'matriz-1',
          numero: 2,
        }),
      };
      prisma.voto = { upsert: jest.fn() };
    });

    it('atualiza o voto existente na mesma revisão', async () => {
      prisma.voto.upsert.mockResolvedValue({ id: 'voto-1', voto: 'REJEITAR' });

      await service.votar(
        'matriz-1',
        { voto: 'REJEITAR', comentario: 'Ajustar prazo' },
        conselheiro,
      );

      expect(prisma.voto.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            revisaoId_usuarioId: {
              revisaoId: 'revisao-2',
              usuarioId: 'conselheiro-1',
            },
          },
          update: expect.objectContaining({ voto: 'REJEITAR' }),
          create: expect.objectContaining({
            revisaoId: 'revisao-2',
            usuarioId: 'conselheiro-1',
          }),
        }),
      );
    });

    it('usa a revisão atual e o usuário autenticado, ignorando IDs enviados no DTO', async () => {
      prisma.voto.upsert.mockResolvedValue({ id: 'voto-1' });

      await service.votar(
        'matriz-1',
        {
          voto: 'APROVAR',
          comentario: 'ok',
          usuarioId: 'outro-usuario',
          revisaoId: 'revisao-1',
          matrizId: 'outra-matriz',
        } as any,
        conselheiro,
      );

      expect(prisma.voto.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            revisaoId_usuarioId: {
              revisaoId: 'revisao-2',
              usuarioId: 'conselheiro-1',
            },
          },
          create: expect.objectContaining({
            matrizId: 'matriz-1',
            revisaoId: 'revisao-2',
            usuarioId: 'conselheiro-1',
          }),
        }),
      );
    });

    it('mantém votos independentes quando a revisão atual muda', async () => {
      prisma.matrizRevisao.findFirst
        .mockResolvedValueOnce({
          id: 'revisao-1',
          matrizId: 'matriz-1',
          numero: 1,
        })
        .mockResolvedValueOnce({
          id: 'revisao-2',
          matrizId: 'matriz-1',
          numero: 2,
        });
      prisma.voto.upsert.mockResolvedValue({ id: 'voto-1' });

      await service.votar(
        'matriz-1',
        { voto: 'APROVAR', comentario: 'v1' },
        conselheiro,
      );
      await service.votar(
        'matriz-1',
        { voto: 'REJEITAR', comentario: 'v2' },
        conselheiro,
      );

      expect(prisma.voto.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            revisaoId_usuarioId: {
              revisaoId: 'revisao-1',
              usuarioId: 'conselheiro-1',
            },
          },
        }),
      );
      expect(prisma.voto.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: {
            revisaoId_usuarioId: {
              revisaoId: 'revisao-2',
              usuarioId: 'conselheiro-1',
            },
          },
        }),
      );
    });
  });

  describe('getHistorico', () => {
    it('retorna todas as revisões com os votos associados à revisão correta', async () => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        criadoPor: { setor: 'Planejamento' },
      });
      prisma.matrizRevisao = {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'revisao-1',
            numero: 1,
            matrizId: 'matriz-1',
            votos: [{ id: 'voto-1', revisaoId: 'revisao-1' }],
          },
          {
            id: 'revisao-2',
            numero: 2,
            matrizId: 'matriz-1',
            votos: [{ id: 'voto-2', revisaoId: 'revisao-2' }],
          },
        ]),
      };

      const historico = await service.getHistorico('matriz-1', {
        id: 'user-1',
        role: 'USUARIO' as const,
      });

      expect(historico.revisoes).toHaveLength(2);
      expect(historico.revisoes[0].votos[0].revisaoId).toBe('revisao-1');
      expect(historico.revisoes[1].votos[0].revisaoId).toBe('revisao-2');
    });

    it('impede usuário sem permissão de consultar o histórico', async () => {
      prisma.matriz.findUnique.mockResolvedValue({
        ...matrizMock,
        criadoPor: { setor: 'Planejamento' },
      });

      await expect(
        service.getHistorico('matriz-1', {
          id: 'outro-usuario',
          role: 'USUARIO' as const,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
