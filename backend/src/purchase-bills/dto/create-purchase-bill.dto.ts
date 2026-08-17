import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator'
import { PurchaseLineInputDto } from './purchase-line-input.dto'

export class CreatePurchaseBillDto {
  @IsString()
  date!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one car' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseLineInputDto)
  lines!: PurchaseLineInputDto[]
}
