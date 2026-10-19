import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator'

const CURRENT_YEAR = new Date().getFullYear() + 1

/** The identifying details of one car — editable even after it's sold, and copied onto its selling bill. */
export class UpdateLineDetailsDto {
  @IsOptional()
  @IsString()
  chassisNumber?: string

  @IsOptional()
  @IsString()
  motorNumber?: string

  /** `null` clears it. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  modelYear?: number | null
}
