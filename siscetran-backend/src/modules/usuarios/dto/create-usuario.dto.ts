import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'novo@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Senha@123',
    description:
      'Opcional. Se não informada, o usuário receberá um link para cadastrar a própria senha.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número' })
  senha?: string;

  @ApiProperty({ enum: Role, default: Role.USUARIO, required: false })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({
    example: 'CTSIST',
    required: false,
    description:
      'Setor do usuário. Obrigatório para USUARIO e ADMIN_SETOR. Um ADMIN_SETOR só pode criar usuários do próprio setor.',
  })
  @IsOptional()
  @IsString()
  setor?: string;
}
