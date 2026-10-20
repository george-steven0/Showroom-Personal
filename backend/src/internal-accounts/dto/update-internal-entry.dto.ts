import { PartialType } from '@nestjs/mapped-types'
import { CreateInternalEntryDto } from './create-internal-entry.dto'

export class UpdateInternalEntryDto extends PartialType(CreateInternalEntryDto) {}
