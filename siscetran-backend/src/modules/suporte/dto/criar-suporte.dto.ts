import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class CriarSuporteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nome: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(30)
  telefone: string;

  @IsIn(['Acesso', 'Cadastro de matriz', 'Andamento ou etapas', 'Comitê', 'Outro'])
  tipoProblema: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  descricao: string;

}
