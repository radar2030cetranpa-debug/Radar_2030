import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { SuporteController } from './suporte.controller';
import { SuporteService } from './suporte.service';

@Module({
  imports: [MailModule],
  controllers: [SuporteController],
  providers: [SuporteService],
})
export class SuporteModule {}
