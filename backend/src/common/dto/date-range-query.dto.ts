import { IsOptional, IsString } from 'class-validator'

export class DateRangeQueryDto {
  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
