import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class UpdateUsuarioDto {
  @ApiProperty({ example: 'novo@email.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: 'NovaSenha@123',
    required: false,
    description:
      'Mínimo 8 caracteres, com ao menos 1 letra maiúscula e 1 número',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número' })
  senha?: string;

  @ApiProperty({ example: 'CTSIST', required: false })
  @IsOptional()
  @IsString()
  setor?: string;
}
