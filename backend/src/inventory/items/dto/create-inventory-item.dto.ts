import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

import { ConsignmentDetailsDto, strictBoolean } from '../../../common/dto/set-consignment.dto'

const CURRENT_YEAR = new Date().getFullYear() + 1

export class CreateInventoryItemDto extends ConsignmentDetailsDto {
  @IsString()
  @IsNotEmpty({ message: 'Car type is required' })
  carType!: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsString()
  trimLevel?: string

  @IsOptional()
  @IsString()
  chassisNumber?: string

  @IsOptional()
  @IsString()
  motorNumber?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  modelYear?: number

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @strictBoolean()
  @IsBoolean()
  isConsignment?: boolean

  @IsString()
  @IsNotEmpty({ message: 'Branch is required' })
  branchId!: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  buyPrice?: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  traderSellPrice!: number

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedPrice!: number
}
