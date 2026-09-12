import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class MarkSoldDto {
  @IsString()
  @IsNotEmpty({ message: 'Buyer name is required' })
  buyerName!: string

  @IsOptional()
  @IsString()
  buyerPhone?: string

  @IsOptional()
  @IsString()
  buyerAddress?: string

  @IsOptional()
  @IsString()
  saleNotes?: string

  @IsOptional()
  @IsString()
  saleDate?: string

  /** How much the buyer has paid so far — can be less than the customer sell price for a partial payment. */
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Paid amount cannot be negative' })
  paidAmount!: number
}
