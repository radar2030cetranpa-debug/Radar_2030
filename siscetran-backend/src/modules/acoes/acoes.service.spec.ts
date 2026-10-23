import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AcoesService } from './acoes.service';

describe('AcoesService.update', () => {
  let service: AcoesService;
  let prisma: {
    acao: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      acao: {
        findUnique: jest.fn().mockResolvedValue({ id: 'AE 1.1.1.1' }),
        update: jest.fn().mockResolvedValue({ id: 'AE 1.1.1.1' }),
      },
    };
    service = new AcoesService(prisma as unknown as PrismaService);
  });

  it('allows Admin do Setor to change only the action sector', async () => {
    await service.update(
      'AE 1.1.1.1',
      { setor: 'CTSIST' },
      { id: 'admin-setor', role: Role.ADMIN_SETOR, setor: 'CTSIST' },
    );

    expect(prisma.acao.update).toHaveBeenCalledWith({
      where: { id: 'AE 1.1.1.1' },
      data: { setor: 'CTSIST' },
    });
  });

  it('rejects other action edits from Admin do Setor', async () => {
    await expect(
      service.update(
        'AE 1.1.1.1',
        { setor: 'CTSIST', diretriz: 'Alteração não autorizada' },
        { id: 'admin-setor', role: Role.ADMIN_SETOR, setor: 'CTSIST' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.acao.update).not.toHaveBeenCalled();
  });

  it('allows Admin Geral to update dashboard action data', async () => {
    await service.update(
      'AE 1.1.1.1',
      { setor: 'CTSIST', diretriz: 'Diretriz atualizada' },
      { id: 'admin-geral', role: Role.ADMIN_GERAL },
    );

    expect(prisma.acao.update).toHaveBeenCalledWith({
      where: { id: 'AE 1.1.1.1' },
      data: {
        setor: 'CTSIST',
        diretriz: 'Diretriz atualizada',
        dadosIncompletos: undefined,
      },
    });
  });
});
