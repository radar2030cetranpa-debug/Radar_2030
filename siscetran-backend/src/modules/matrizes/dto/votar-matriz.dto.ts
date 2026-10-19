import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { TipoVoto } from '@prisma/client';

export class VotarMatrizDto {
  @ApiProperty({ enum: TipoVoto, enumName: 'TipoVoto' })
  @IsEnum(TipoVoto)
  voto: TipoVoto;

  @ApiProperty({
    example: 'Concordo com a proposta, mas sugiro revisar o prazo.',
    required: false,
  })
  @IsString()
  @IsOptional()
  comentario?: string;
}
