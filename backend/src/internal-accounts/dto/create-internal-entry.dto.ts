import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { INTERNAL_ENTRY_TYPES, type InternalEntryType } from '../../common/enums'

export class CreateInternalEntryDto {
  @IsString()
  @IsNotEmpty({ message: 'Item name is required' })
  itemName!: string

  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount!: number

  @IsIn(INTERNAL_ENTRY_TYPES, { message: 'Type must be paid or owed' })
  type!: InternalEntryType

  @IsDateString({}, { message: 'Date is required' })
  date!: string

  @IsOptional()
  @IsString()
  notes?: string
}
