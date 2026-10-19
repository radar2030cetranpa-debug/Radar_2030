import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, senha: string): Promise<any> {
    const usuario = await this.authService.validateUser(email, senha);
    if (!usuario) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return usuario;
  }
}
