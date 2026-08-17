import { IsOptional, IsString } from 'class-validator'

export class CancelPurchaseBillDto {
  @IsOptional()
  @IsString()
  reason?: string
}
