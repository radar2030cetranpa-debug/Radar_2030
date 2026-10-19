import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { CriarSuporteDto } from './dto/criar-suporte.dto';
import { SuporteService } from './suporte.service';

@Controller('suporte')
export class SuporteController {
  constructor(private readonly suporteService: SuporteService) {}

  @Public()
  @Post()
  async criarSolicitacao(@Body() dto: CriarSuporteDto) {
    return this.suporteService.enviarSolicitacao(dto);
  }
}
