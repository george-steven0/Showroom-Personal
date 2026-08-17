import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class SettlePaymentDto {
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
