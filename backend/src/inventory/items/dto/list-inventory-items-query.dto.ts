import { IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto'

export class ListInventoryItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string

  @IsOptional()
  @IsIn(['in_stock', 'partial_paid', 'sold'])
  status?: 'in_stock' | 'partial_paid' | 'sold'
}
