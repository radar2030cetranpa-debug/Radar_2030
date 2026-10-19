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
  Request,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
@UseGuards(JwtGuard, RolesGuard)
@Roles(Role.ADMIN_SETOR, Role.ADMIN_GERAL)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar usuários (escopo por setor para Admin de Setor)',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuários retornada' })
  @ApiQuery({ name: 'busca', required: false, description: 'Buscar por email' })
  async findAll(@Query('busca') busca: string, @Request() req: any) {
    return this.usuariosService.findAll(busca, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.findOne(id, req.user);
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @Request() req: any,
  ) {
    return this.usuariosService.create(createUsuarioDto, req.user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Request() req: any,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto, req.user);
  }

  @Put(':id/role')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({ summary: 'Alterar perfil do usuário (apenas Admin Geral)' })
  @ApiResponse({ status: 200, description: 'Perfil alterado com sucesso' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Request() req: any,
  ) {
    return this.usuariosService.updateRole(id, updateRoleDto, req.user);
  }

  @Put(':id/desativar')
  @ApiOperation({ summary: 'Desativar usuário (soft-delete)' })
  @ApiResponse({ status: 200, description: 'Usuário desativado' })
  async desativar(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.desativar(id, req.user);
  }

  @Put(':id/ativar')
  @ApiOperation({ summary: 'Reativar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário reativado' })
  async ativar(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.ativar(id, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN_GERAL)
  @ApiOperation({
    summary: 'Remover usuário definitivamente (apenas Admin Geral)',
  })
  @ApiResponse({ status: 204, description: 'Usuário removido' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.usuariosService.remove(id, req.user);
  }
}
