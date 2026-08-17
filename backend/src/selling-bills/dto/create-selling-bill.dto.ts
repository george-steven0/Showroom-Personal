import { Type } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateSellingBillDto {
  @IsString()
  @IsNotEmpty({ message: 'Select a car' })
  purchaseLineId!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Selling price must be greater than 0' })
  sellingPrice!: number

  @IsString()
  sellingDate!: string

  @IsString()
  @IsNotEmpty({ message: 'Buyer name is required' })
  buyerName!: string

  @IsOptional()
  @IsString()
  buyerAddress?: string

  @IsOptional()
  @IsString()
  buyerPhone?: string

  @IsOptional()
  @IsString()
  notes?: string
}
