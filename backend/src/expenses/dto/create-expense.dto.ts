import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount!: number

  @IsString()
  date!: string

  @IsOptional()
  @IsString()
  note?: string
}
