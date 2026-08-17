import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'

/** Query params every list endpoint accepts. `pageSize=0` returns every row unpaginated. */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pageSize?: number = 20

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  sortBy?: string

  @IsOptional()
  @IsIn(['ascend', 'descend'])
  sortOrder?: 'ascend' | 'descend'
}
