import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AcaoEtapaDto } from './create-matriz.dto';

export class AtualizarProgressoDto {
  @ApiProperty({ example: 60 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentual: number;

  @ApiProperty({ type: [AcaoEtapaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcaoEtapaDto)
  acoes: AcaoEtapaDto[];
}
