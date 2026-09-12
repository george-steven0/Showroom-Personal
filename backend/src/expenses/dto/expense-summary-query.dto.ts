import { IsOptional, IsString } from 'class-validator'

export class ExpenseSummaryQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
