import { Type } from 'class-transformer'
import { IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class RecordInventoryPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount!: number

  @IsOptional()
  @IsString()
  date?: string
}
