import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string

  @IsOptional()
  @IsString()
  phone?: string

  @IsOptional()
  @IsString()
  phone2?: string

  @IsOptional()
  @IsString()
  address?: string

  @IsOptional()
  @IsString()
  notes?: string
}
