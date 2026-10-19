import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { ComiteService } from './comite.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, Status } from '@prisma/client';
import { AvaliarMatrizDto } from '../matrizes/dto/avaliar-matriz.dto';
import { VotarMatrizDto } from '../matrizes/dto/votar-matriz.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('comite')
@ApiBearerAuth()
@Controller('comite')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.COMITE, Role.ADMIN_GERAL)
export class ComiteController {
  constructor(private readonly comiteService: ComiteService) {}

  @Get('pendentes')
  @ApiOperation({ summary: 'Listar matrizes pendentes de avaliação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de matrizes pendentes retornada',
  })
  async getPendentes() {
    return this.comiteService.getPendentes();
  }

  @Get('estatisticas')
  @ApiOperation({ summary: 'Obter estatísticas do comitê' })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas retornadas com sucesso',
  })
  async getEstatisticas() {
    return this.comiteService.getEstatisticas();
  }

  @Get('matrizes')
  @ApiOperation({ summary: 'Listar matrizes com filtro de status' })
  @ApiResponse({ status: 200, description: 'Lista de matrizes retornada' })
  @ApiQuery({ name: 'status', required: false, enum: Status })
  async getMatrizes(@Query('status') status?: Status) {
    return this.comiteService.getMatrizes(status);
  }

  @Get('matrizes/:id')
  @ApiOperation({ summary: 'Buscar matriz para avaliação' })
  @ApiResponse({ status: 200, description: 'Matriz encontrada' })
  @ApiResponse({ status: 404, description: 'Matriz não encontrada' })
  async getMatriz(@Param('id') id: string) {
    return this.comiteService.getMatriz(id);
  }

  @Get('matrizes/:id/historico')
  @Roles(Role.USUARIO, Role.ADMIN_SETOR, Role.COMITE, Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Obter histórico de revisões e votos da matriz' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  async getHistorico(@Param('id') id: string, @Request() req: any) {
    return this.comiteService.getHistorico(id, req.user);
  }

  @Post('matrizes/:id/votar')
  @ApiOperation({
    summary: 'Registrar voto consultivo (Conselheiro ou Admin Geral)',
  })
  @ApiResponse({ status: 200, description: 'Voto registrado com sucesso' })
  async votar(
    @Param('id') id: string,
    @Body() votarMatrizDto: VotarMatrizDto,
    @Request() req: any,
  ) {
    return this.comiteService.votar(id, votarMatrizDto, req.user.id);
  }

  @Put('matrizes/:id/avaliar')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Decisão final da matriz — apenas Admin Geral' })
  @ApiResponse({ status: 200, description: 'Matriz avaliada com sucesso' })
  @ApiResponse({ status: 404, description: 'Matriz não encontrada' })
  @ApiResponse({ status: 400, description: 'Matriz não pode ser avaliada' })
  async avaliar(
    @Param('id') id: string,
    @Body() avaliarMatrizDto: AvaliarMatrizDto,
    @Request() req: any,
  ) {
    return this.comiteService.avaliar(id, avaliarMatrizDto, req.user.id);
  }
}
