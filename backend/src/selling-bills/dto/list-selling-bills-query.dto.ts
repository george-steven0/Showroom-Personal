import { IsIn, IsOptional } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'

export class ListSellingBillsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['active', 'cancelled'])
  status?: 'active' | 'cancelled'
}
