import { IsNotEmpty, IsString } from 'class-validator'

export class MovementsSummaryQueryDto {
  @IsString()
  @IsNotEmpty()
  from!: string

  @IsString()
  @IsNotEmpty()
  to!: string
}
