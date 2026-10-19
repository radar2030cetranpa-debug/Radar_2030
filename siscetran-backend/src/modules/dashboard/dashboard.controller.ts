import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtGuard } from '../../common/guards/jwt.guard';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Obter KPIs do dashboard' })
  @ApiResponse({ status: 200, description: 'KPIs retornados com sucesso' })
  async getKpis() {
    return this.dashboardService.getKpis();
  }

  @Get('graficos')
  @ApiOperation({ summary: 'Obter dados para gráficos' })
  @ApiResponse({ status: 200, description: 'Dados dos gráficos retornados' })
  async getGraficos() {
    return this.dashboardService.getGraficos();
  }

  @Get('resumo')
  @ApiOperation({ summary: 'Obter resumo completo do dashboard' })
  @ApiResponse({ status: 200, description: 'Resumo retornado com sucesso' })
  async getResumo() {
    return this.dashboardService.getResumo();
  }

  @Get('matrizes/aprovadas')
  @ApiOperation({ summary: 'Listar matrizes aprovadas' })
  @ApiResponse({
    status: 200,
    description: 'Lista de matrizes aprovadas retornada',
  })
  async getMatrizesAprovadas() {
    return this.dashboardService.getMatrizesAprovadas();
  }
}
