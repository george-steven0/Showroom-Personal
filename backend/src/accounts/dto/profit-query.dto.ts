import { IsNotEmpty, IsString } from 'class-validator'

export class ProfitQueryDto {
  @IsString()
  @IsNotEmpty()
  from!: string

  @IsString()
  @IsNotEmpty()
  to!: string
}
