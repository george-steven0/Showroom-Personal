import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ListInventoryItemsQueryDto extends PaginationQueryDto {
  /** Comma-separated branch ids, e.g. "b1,b2" — lets the UI filter by multiple branches at once. */
  @IsOptional()
  @IsString()
  branchId?: string

  /** Comma-separated statuses, e.g. "in_stock,partial_paid". */
  @IsOptional()
  @IsString()
  status?: string

  /** 'true' = consignment (أمانة) cars only, 'false' = everything else. */
  @IsOptional()
  @IsIn(['true', 'false'])
  consignment?: 'true' | 'false'

  /** Sale date range — plain days ("2026-09-24"); the sale date is stored as a date only, so a day is compared whole. */
  @IsOptional()
  @IsDateString()
  saleFrom?: string

  @IsOptional()
  @IsDateString()
  saleTo?: string

  /**
   * Purchase date (when the car was added) range — exact instants (ISO 8601), start and end of the user's day.
   * That column is a full timestamp, so plain days would drop everything added on the range's last day.
   */
  @IsOptional()
  @IsDateString()
  purchaseFrom?: string

  @IsOptional()
  @IsDateString()
  purchaseTo?: string
}
