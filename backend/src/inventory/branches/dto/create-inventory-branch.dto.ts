import { IsNotEmpty, IsString } from 'class-validator'

export class CreateInventoryBranchDto {
  @IsString()
  @IsNotEmpty({ message: 'Branch name is required' })
  name!: string

  @IsString()
  @IsNotEmpty({ message: 'Branch name (Arabic) is required' })
  nameAr!: string
}
