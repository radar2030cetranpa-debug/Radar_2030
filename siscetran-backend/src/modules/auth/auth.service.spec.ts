import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: { usuario: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  const usuarioMock = {
    id: 'user-1',
    email: 'admin@email.com',
    senha: '',
    role: 'ADMIN_GERAL',
    setor: null,
    ativo: true,
    ultimaTrocaSenha: new Date(),
  };

  beforeEach(async () => {
    usuarioMock.senha = await bcrypt.hash('admin123', 10);

    prisma = {
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('fake-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('deve autenticar com credenciais válidas e retornar um token', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

      const resultado = await authService.login({
        email: 'admin@email.com',
        senha: 'admin123',
      });

      expect(resultado.access_token).toBe('fake-jwt-token');
      expect(resultado.usuario.email).toBe('admin@email.com');
      expect(resultado.usuario).not.toHaveProperty('senha');
    });

    it('deve lançar UnauthorizedException com senha incorreta', async () => {
      prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

      await expect(
        authService.login({ email: 'admin@email.com', senha: 'errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o usuário não existir', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ninguem@email.com', senha: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o usuário estiver desativado', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...usuarioMock,
        ativo: false,
      });

      await expect(
        authService.login({ email: 'admin@email.com', senha: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a senha estiver expirada (mais de 6 meses)', async () => {
      const seteMesesAtras = new Date();
      seteMesesAtras.setMonth(seteMesesAtras.getMonth() - 7);

      prisma.usuario.findUnique.mockResolvedValue({
        ...usuarioMock,
        ultimaTrocaSenha: seteMesesAtras,
      });

      await expect(
        authService.login({ email: 'admin@email.com', senha: 'admin123' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
