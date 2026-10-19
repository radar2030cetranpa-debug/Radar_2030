import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

export class RedefinirSenhaDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NovaSenha@456',
    description:
      'Mínimo 8 caracteres, com ao menos 1 letra maiúscula e 1 número',
  })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @Matches(/[A-Z]/, {
    message: 'A senha deve conter ao menos uma letra maiúscula',
  })
  @Matches(/[0-9]/, { message: 'A senha deve conter ao menos um número' })
  novaSenha: string;
}
