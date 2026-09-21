import { IsOptional, IsString } from 'class-validator'

export class InventoryStatsQueryDto {
  /** Comma-separated branch ids, same as the list endpoint — the KPI blocks follow the branch filter. */
  @IsOptional()
  @IsString()
  branchId?: string
}
