import { IsOptional, IsString } from 'class-validator'

export class CancelSellingBillDto {
  @IsOptional()
  @IsString()
  reason?: string
}
