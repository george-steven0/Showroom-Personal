import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator'

/** Reads the raw JSON value — the global pipe's implicit conversion would otherwise turn "false"/"yes" into `true`. */
export const strictBoolean = () => Transform(({ obj, key }) => (obj as Record<string, unknown>)[key])

/** Who took a consignment (أمانة) car and on what terms. The "trader name is required" rule lives in `consignmentData`. */
export class ConsignmentDetailsDto {
  @IsOptional()
  @IsString()
  consignmentTraderName?: string

  @IsOptional()
  @IsString()
  consignmentDate?: string

  @IsOptional()
  @IsString()
  consignmentAddress?: string

  /** Paid so far — leave out (or 0) when the trader hasn't paid anything yet. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consignmentPaidAmount?: number

  @IsOptional()
  @IsString()
  consignmentNotes?: string
}

export class SetConsignmentDto extends ConsignmentDetailsDto {
  @strictBoolean()
  @IsBoolean()
  isConsignment!: boolean
}
