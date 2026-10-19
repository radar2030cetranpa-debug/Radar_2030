import {
  Controller,
  Post,
  Put,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TrocarSenhaDto } from './dto/trocar-senha.dto';
import { RecuperarSenhaDto } from './dto/recuperar-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login do usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({
    status: 401,
    description: 'Credenciais inválidas, usuário inativo ou senha expirada',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles(Role.ADMIN_SETOR, Role.ADMIN_GERAL)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrar novo usuário (admin do setor ou admin geral)',
  })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Usuário já existe' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(JwtGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do usuário logado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Put('trocar-senha')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trocar a própria senha (usuário autenticado)' })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  async trocarSenha(@Request() req, @Body() dto: TrocarSenhaDto) {
    return this.authService.trocarSenha(req.user.id, dto);
  }

  @Public()
  @Post('recuperar-senha')
  @ApiOperation({ summary: 'Solicitar recuperação de senha por e-mail (mock)' })
  @ApiResponse({
    status: 200,
    description: 'Instruções enviadas (se o e-mail existir)',
  })
  async recuperarSenha(@Body() dto: RecuperarSenhaDto) {
    return this.authService.recuperarSenha(dto);
  }

  @Public()
  @Post('redefinir-senha')
  @ApiOperation({ summary: 'Redefinir senha usando o token de recuperação' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.authService.redefinirSenha(dto);
  }
}
