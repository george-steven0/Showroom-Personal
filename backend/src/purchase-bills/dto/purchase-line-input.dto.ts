import { Type } from 'class-transformer'
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

const CURRENT_YEAR = new Date().getFullYear() + 1

export class PurchaseLineInputDto {
  @IsString()
  @IsNotEmpty({ message: 'Item name is required' })
  itemName!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  quantity!: number

  @IsOptional()
  @IsString()
  description?: string

  @IsString()
  @IsNotEmpty({ message: 'Supplier is required' })
  supplierId!: string

  @IsString()
  @IsNotEmpty({ message: 'Chassis number is required' })
  chassisNumber!: string

  @IsString()
  @IsNotEmpty({ message: 'Motor number is required' })
  motorNumber!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  modelYear?: number

  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Price must be greater than 0' })
  price!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Paid amount cannot be negative' })
  paidAmount!: number

  @IsOptional()
  @IsString()
  notes?: string
}
