import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Impacto } from '@prisma/client';
import { AcaoEtapaDto } from './create-matriz.dto';

export class UpdateMatrizDto {
  @ApiProperty({
    example: 'Modernização da Frota de Fiscalização',
    required: false,
  })
  @IsString()
  @IsOptional()
  nome?: string;

  @ApiProperty({ example: 'Descrever a ação a ser executada', required: false })
  @IsString()
  @IsOptional()
  oque?: string;

  @ApiProperty({ example: 'Justificativa da ação', required: false })
  @IsString()
  @IsOptional()
  porque?: string;

  @ApiProperty({ example: 'Metodologia de execução', required: false })
  @IsString()
  @IsOptional()
  como?: string;

  @ApiProperty({ example: '2025-12-31', required: false })
  @IsString()
  @IsOptional()
  quando?: string;

  @ApiProperty({ example: 'Belém, PA', required: false })
  @IsString()
  @IsOptional()
  onde?: string;

  @ApiProperty({ example: 'R$ 1.500,00', required: false })
  @IsString()
  @IsOptional()
  quanto?: string;

  @ApiProperty({ enum: Impacto, required: false })
  @IsEnum(Impacto)
  @IsOptional()
  impacto?: Impacto;

  @ApiProperty({ example: 'Observações adicionais', required: false })
  @IsString()
  @IsOptional()
  observacao?: string;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentual?: number;

  @ApiProperty({ type: [AcaoEtapaDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AcaoEtapaDto)
  acoes?: AcaoEtapaDto[];
}
