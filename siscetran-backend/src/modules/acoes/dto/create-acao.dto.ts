import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { Prazo } from '@prisma/client';

export class CreateAcaoDto {
  @ApiProperty({ example: 'AE 1.1.1.1' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'OG1.1: Liderar a aprovação...', required: false })
  @IsString()
  @IsOptional()
  og?: string;

  @ApiProperty({ example: 'LAE 1.1.1: Estruturação...', required: false })
  @IsString()
  @IsOptional()
  lae?: string;

  @ApiProperty({ example: 'Desenvolver minuta legal...' })
  @IsString()
  @IsNotEmpty()
  diretriz: string;

  @ApiProperty({ enum: Prazo })
  @IsEnum(Prazo)
  prazo: Prazo;

  @ApiProperty({ example: 'Secretaria-Executiva', required: false })
  @IsString()
  @IsOptional()
  setor?: string;

  @ApiProperty({ example: 'Proposta legal elaborada...' })
  @IsString()
  @IsNotEmpty()
  meta: string;

  @ApiProperty({ example: '% de conclusão...' })
  @IsString()
  @IsNotEmpty()
  indicador: string;

  @ApiProperty({ example: 'Conformidade legal...', required: false })
  @IsString()
  @IsOptional()
  restricoes?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  linhaPlanilha: number;

  @ApiProperty({ example: 'Secretaria-Executiva', required: false })
  @IsString()
  @IsOptional()
  responsavel?: string;

  @ApiProperty({ example: [], required: false })
  @IsArray()
  @IsOptional()
  dadosIncompletos?: string[];
}
