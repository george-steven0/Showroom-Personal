import { IsIn, IsOptional, IsString } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'

export class ListFollowUpClientsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['very_likely', 'medium', 'unlikely'])
  rating?: 'very_likely' | 'medium' | 'unlikely'

  @IsOptional()
  @IsIn(['following_up', 'converted', 'lost'])
  status?: 'following_up' | 'converted' | 'lost'

  @IsOptional()
  @IsString()
  from?: string

  @IsOptional()
  @IsString()
  to?: string
}
