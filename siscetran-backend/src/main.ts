import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Helmet - Segurança
  app.use(helmet());

  // CORS
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        configuredOrigins.includes('*') ||
        configuredOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /\.netlify\.app$/.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefixo global
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Radar 2030 API')
    .setDescription('API do Sistema de Monitoramento do Plano Estratégico Cetran/PA 2030')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticação')
    .addTag('usuarios', 'Gestão de Usuários')
    .addTag('matrizes', 'Matrizes 5W2H')
    .addTag('acoes', 'Ações Estratégicas')
    .addTag('comite', 'Avaliação do Comitê')
    .addTag('dashboard', 'Dashboard e KPIs')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Radar 2030 API rodando em: http://localhost:${port}`);
  console.log(`📚 Documentação Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
