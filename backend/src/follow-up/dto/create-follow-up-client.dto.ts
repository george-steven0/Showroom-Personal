import { Type } from 'class-transformer'
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'

const CURRENT_YEAR = new Date().getFullYear() + 1

export class CreateFollowUpClientDto {
  @IsString()
  @IsNotEmpty({ message: 'Client name is required' })
  clientName!: string

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone!: string

  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address!: string

  @IsString()
  @IsNotEmpty({ message: 'Car type is required' })
  carType!: string

  @IsOptional()
  @IsString()
  carModel?: string

  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  modelYear!: number

  @IsString()
  @IsNotEmpty({ message: 'Color is required' })
  color!: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agreedPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  downPayment?: number

  @IsOptional()
  @IsIn(['very_likely', 'medium', 'unlikely'])
  rating?: 'very_likely' | 'medium' | 'unlikely'

  @IsOptional()
  @IsIn(['following_up', 'converted', 'lost'])
  status?: 'following_up' | 'converted' | 'lost'

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsString()
  nextFollowUpDate?: string
}
