import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';

export class TrocarSenhaDto {
  @ApiProperty({ example: 'SenhaAtual@123' })
  @IsString()
  @IsNotEmpty()
  senhaAtual: string;

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
