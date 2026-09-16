import { IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'

export class ListSellingBillsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['active', 'cancelled'])
  status?: 'active' | 'cancelled'

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
