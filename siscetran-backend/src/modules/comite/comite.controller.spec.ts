import { ComiteController } from './comite.controller';

describe('ComiteController', () => {
  it('encaminha o ID do usuário autenticado ao registrar voto', async () => {
    const comiteService = {
      votar: jest.fn().mockResolvedValue({ id: 'voto-1' }),
    };
    const controller = new ComiteController(comiteService as any);

    await controller.votar(
      'matriz-1',
      { voto: 'APROVAR', comentario: 'ok', usuarioId: 'falso' } as any,
      { user: { id: 'usuario-autenticado' } },
    );

    expect(comiteService.votar).toHaveBeenCalledWith(
      'matriz-1',
      expect.objectContaining({ voto: 'APROVAR', usuarioId: 'falso' }),
      'usuario-autenticado',
    );
  });

  it('encaminha o identificador solicitado ao consultar histórico', async () => {
    const historico = { matriz: { id: 'matriz-1' }, revisoes: [] };
    const comiteService = {
      getHistorico: jest.fn().mockResolvedValue(historico),
    };
    const controller = new ComiteController(comiteService as any);

    await expect(
      controller.getHistorico('matriz-1', {
        user: { id: 'user-1', role: 'USUARIO' },
      }),
    ).resolves.toBe(historico);
    expect(comiteService.getHistorico).toHaveBeenCalledWith('matriz-1', {
      id: 'user-1',
      role: 'USUARIO',
    });
  });
});
