import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { MatrizesService } from './matrizes.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, Status } from '@prisma/client';
import { CreateMatrizDto } from './dto/create-matriz.dto';
import { UpdateMatrizDto } from './dto/update-matriz.dto';
import { AvaliarMatrizDto } from './dto/avaliar-matriz.dto';
import { VotarMatrizDto } from './dto/votar-matriz.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('matrizes')
@ApiBearerAuth()
@Controller('matrizes')
@UseGuards(JwtGuard, RolesGuard)
export class MatrizesController {
  constructor(private readonly matrizesService: MatrizesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar matrizes (escopo por perfil/setor)' })
  @ApiResponse({ status: 200, description: 'Lista de matrizes retornada' })
  @ApiQuery({ name: 'status', required: false, enum: Status })
  @ApiQuery({ name: 'usuarioId', required: false })
  async findAll(
    @Query('status') status: Status | undefined,
    @Query('usuarioId') usuarioId: string | undefined,
    @Request() req: any,
  ) {
    return this.matrizesService.findAll(status, req.user, usuarioId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar matriz por ID' })
  @ApiResponse({ status: 200, description: 'Matriz encontrada' })
  @ApiResponse({ status: 404, description: 'Matriz não encontrada' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.matrizesService.findOne(id, req.user);
  }

  @Get(':id/historico')
  @ApiOperation({ summary: 'Obter histórico de revisões e votos da matriz' })
  @ApiResponse({ status: 200, description: 'Histórico retornado com sucesso' })
  async getHistorico(@Param('id') id: string, @Request() req: any) {
    return this.matrizesService.getHistorico(id, req.user);
  }

  @Post()
  @Roles(Role.USUARIO, Role.COMITE, Role.ADMIN_SETOR, Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Criar nova matriz' })
  @ApiResponse({ status: 201, description: 'Matriz criada com sucesso' })
  async create(@Body() createMatrizDto: CreateMatrizDto, @Request() req: any) {
    return this.matrizesService.create(createMatrizDto, req.user.id);
  }

  @Put(':id')
  @Roles(Role.USUARIO, Role.ADMIN_SETOR, Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Atualizar matriz (Conselheiro não pode editar)' })
  @ApiResponse({ status: 200, description: 'Matriz atualizada' })
  @ApiResponse({ status: 404, description: 'Matriz não encontrada' })
  async update(
    @Param('id') id: string,
    @Body() updateMatrizDto: UpdateMatrizDto,
    @Request() req: any,
  ) {
    return this.matrizesService.update(id, updateMatrizDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.USUARIO, Role.ADMIN_SETOR, Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Remover matriz (Conselheiro não pode remover)' })
  @ApiResponse({ status: 204, description: 'Matriz removida' })
  @ApiResponse({ status: 404, description: 'Matriz não encontrada' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.matrizesService.remove(id, req.user);
  }

  @Post(':id/enviar')
  @Roles(Role.USUARIO, Role.COMITE, Role.ADMIN_SETOR, Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Enviar matriz para o comitê' })
  @ApiResponse({ status: 200, description: 'Matriz enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Matriz não pode ser enviada' })
  async enviar(@Param('id') id: string, @Request() req: any) {
    return this.matrizesService.enviarParaComite(id, req.user.id);
  }

  @Post(':id/votar')
  @Roles(Role.COMITE, Role.ADMIN_GERAL)
  @ApiOperation({
    summary:
      'Registrar voto (Conselheiro ou Admin Geral) — não decide o status final',
  })
  @ApiResponse({ status: 200, description: 'Voto registrado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Matriz não está disponível para votação',
  })
  async votar(
    @Param('id') id: string,
    @Body() votarMatrizDto: VotarMatrizDto,
    @Request() req: any,
  ) {
    return this.matrizesService.votar(id, votarMatrizDto, req.user);
  }

  @Post(':id/avaliar')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Decisão final da matriz — apenas Admin Geral' })
  @ApiResponse({ status: 200, description: 'Matriz avaliada com sucesso' })
  @ApiResponse({ status: 404, description: 'Matriz não encontrada' })
  async avaliar(
    @Param('id') id: string,
    @Body() avaliarMatrizDto: AvaliarMatrizDto,
    @Request() req: any,
  ) {
    return this.matrizesService.avaliar(id, avaliarMatrizDto, req.user.id);
  }

  @Patch(':id/progresso')
  @Roles(Role.USUARIO, Role.ADMIN_SETOR, Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Atualizar etapas e progresso de matriz aprovada' })
  @ApiResponse({ status: 200, description: 'Progresso atualizado com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Matriz não está aprovada ou dados inválidos',
  })
  async atualizarProgresso(
    @Param('id') id: string,
    @Body() dto: AtualizarProgressoDto,
    @Request() req: any,
  ) {
    return this.matrizesService.atualizarProgresso(id, dto, req.user);
  }
}
