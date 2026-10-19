import { JwtModuleOptions } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';

export const jwtConfig: JwtModuleOptions = {
  secret: process.env.JWT_SECRET || 'siscetran-secret-key',
  signOptions: {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  },
};
