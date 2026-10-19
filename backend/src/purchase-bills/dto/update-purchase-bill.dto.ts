import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator'
import { PurchaseLineInputDto } from './purchase-line-input.dto'

/**
 * An edited line may carry the id of the existing line it replaces, so per-line data that isn't part of the
 * form (the consignment marker) survives the full replace even when the car has no chassis number to match on.
 * Only accepted on edit — creating a bill still rejects an `id`.
 */
export class UpdatePurchaseLineInputDto extends PurchaseLineInputDto {
  @IsOptional()
  @IsString()
  id?: string
}

/** Full replace, not a partial patch — see `PurchaseBillsService#update`. */
export class UpdatePurchaseBillDto {
  @IsString()
  date!: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one car' })
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseLineInputDto)
  lines!: UpdatePurchaseLineInputDto[]
}
