import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AcoesService } from './acoes.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateAcaoDto } from './dto/create-acao.dto';
import { UpdateAcaoDto } from './dto/update-acao.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('acoes')
@ApiBearerAuth()
@Controller('acoes')
@UseGuards(JwtGuard, RolesGuard)
export class AcoesController {
  constructor(private readonly acoesService: AcoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as ações estratégicas' })
  @ApiResponse({ status: 200, description: 'Lista de ações retornada' })
  @ApiQuery({
    name: 'busca',
    required: false,
    description: 'Buscar por ID, diretriz ou setor',
  })
  @ApiQuery({ name: 'og', required: false, description: 'Filtrar por OG' })
  @ApiQuery({ name: 'lae', required: false, description: 'Filtrar por LAE' })
  @ApiQuery({
    name: 'setor',
    required: false,
    description: 'Filtrar por setor',
  })
  @ApiQuery({
    name: 'prazo',
    required: false,
    description: 'Filtrar por prazo',
  })
  async findAll(
    @Query('busca') busca?: string,
    @Query('og') og?: string,
    @Query('lae') lae?: string,
    @Query('setor') setor?: string,
    @Query('prazo') prazo?: string,
  ) {
    return this.acoesService.findAll({ busca, og, lae, setor, prazo });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ação por ID' })
  @ApiResponse({ status: 200, description: 'Ação encontrada' })
  @ApiResponse({ status: 404, description: 'Ação não encontrada' })
  async findOne(@Param('id') id: string) {
    return this.acoesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Criar nova ação (admin apenas)' })
  @ApiResponse({ status: 201, description: 'Ação criada com sucesso' })
  @ApiResponse({ status: 409, description: 'ID da ação já existe' })
  async create(@Body() createAcaoDto: CreateAcaoDto) {
    return this.acoesService.create(createAcaoDto);
  }

  @Put(':id')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Atualizar ação (admin apenas)' })
  @ApiResponse({ status: 200, description: 'Ação atualizada' })
  @ApiResponse({ status: 404, description: 'Ação não encontrada' })
  async update(@Param('id') id: string, @Body() updateAcaoDto: UpdateAcaoDto) {
    return this.acoesService.update(id, updateAcaoDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Remover ação (admin apenas)' })
  @ApiResponse({ status: 204, description: 'Ação removida' })
  @ApiResponse({ status: 404, description: 'Ação não encontrada' })
  @ApiResponse({ status: 409, description: 'Ação vinculada a matrizes' })
  async remove(@Param('id') id: string) {
    return this.acoesService.remove(id);
  }

  @Post('importar')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Importar ações em lote (admin apenas)' })
  @ApiResponse({ status: 201, description: 'Ações importadas com sucesso' })
  async importar(@Body() acoes: CreateAcaoDto[]) {
    return this.acoesService.importar(acoes);
  }
}
