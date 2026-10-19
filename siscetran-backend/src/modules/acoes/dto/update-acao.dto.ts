import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Prazo } from '@prisma/client';

export class UpdateAcaoDto {
  @ApiProperty({ example: 'OG1.1: Liderar a aprovação...', required: false })
  @IsString()
  @IsOptional()
  og?: string;

  @ApiProperty({ example: 'LAE 1.1.1: Estruturação...', required: false })
  @IsString()
  @IsOptional()
  lae?: string;

  @ApiProperty({ example: 'Desenvolver minuta legal...', required: false })
  @IsString()
  @IsOptional()
  diretriz?: string;

  @ApiProperty({ enum: Prazo, required: false })
  @IsEnum(Prazo)
  @IsOptional()
  prazo?: Prazo;

  @ApiProperty({ example: 'Secretaria-Executiva', required: false })
  @IsString()
  @IsOptional()
  setor?: string;

  @ApiProperty({ example: 'Proposta legal elaborada...', required: false })
  @IsString()
  @IsOptional()
  meta?: string;

  @ApiProperty({ example: '% de conclusão...', required: false })
  @IsString()
  @IsOptional()
  indicador?: string;

  @ApiProperty({ example: 'Conformidade legal...', required: false })
  @IsString()
  @IsOptional()
  restricoes?: string;

  @ApiProperty({ example: 2, required: false })
  @IsNumber()
  @IsOptional()
  linhaPlanilha?: number;

  @ApiProperty({ example: 'Secretaria-Executiva', required: false })
  @IsString()
  @IsOptional()
  responsavel?: string;

  @ApiProperty({ example: [], required: false })
  @IsArray()
  @IsOptional()
  dadosIncompletos?: string[];
}
