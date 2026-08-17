import { IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'

export class ListExpensesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
