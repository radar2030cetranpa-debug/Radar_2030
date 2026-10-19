import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Módulos
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { MatrizesModule } from './modules/matrizes/matrizes.module';
import { AcoesModule } from './modules/acoes/acoes.module';
import { ComiteModule } from './modules/comite/comite.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { SuporteModule } from './modules/suporte/suporte.module';

@Module({
  imports: [
    // Configurações
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: (Number(process.env.THROTTLE_TTL) || 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT) || 100,
      },
    ]),
    // Módulos
    AuthModule,
    UsuariosModule,
    MatrizesModule,
    AcoesModule,
    ComiteModule,
    DashboardModule,
    SuporteModule,
  ],
})
export class AppModule {}
