import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import * as fs from 'fs'
import * as os from 'os'
import type { Response } from 'express'
import { SettingsService } from './settings.service'
import { UpdateSettingsDto } from './dto/update-settings.dto'
import { ResetDatabaseDto } from './dto/reset-database.dto'
import { Public } from '../common/decorators/public.decorator'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

const MAX_RESTORE_BYTES = 200 * 1024 * 1024

/** Hand-rolled instead of pulling in @types/multer for the one endpoint that needs it. */
interface UploadedDbFile {
  path: string
  originalname: string
  size: number
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Public: the login screen itself needs the showroom's name/logo before anyone signs in. */
  @Public()
  @Get()
  get() {
    return this.settings.get()
  }

  @Patch()
  update(@Body() dto: UpdateSettingsDto, @CurrentUser() user: RequestUser) {
    return this.settings.update(dto, user)
  }

  @Get('backups')
  listBackups() {
    return this.settings.listBackups()
  }

  @Post('backups')
  @HttpCode(HttpStatus.OK)
  createBackup() {
    return this.settings.createBackup()
  }

  @Get('backups/:filename/download')
  downloadBackup(@Param('filename') filename: string, @Res({ passthrough: true }) res: Response) {
    const filePath = this.settings.resolveBackupFilePath(filename)
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    return new StreamableFile(fs.createReadStream(filePath))
  }

  @Post('backups/:filename/restore')
  @HttpCode(HttpStatus.OK)
  restoreFromBackup(@Param('filename') filename: string, @CurrentUser() user: RequestUser) {
    return this.settings.restoreFromBackupFile(filename, user)
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  reset(@Body() dto: ResetDatabaseDto, @CurrentUser() user: RequestUser) {
    return this.settings.resetAllData(user)
  }

  /**
   * The one multipart endpoint in the API — everything else uploads
   * inline as base64 JSON (like `logo`), but a database file is too big
   * for the global JSON body limit and base64 would inflate it further,
   * so Multer streams straight to a temp file instead.
   */
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      dest: os.tmpdir(),
      limits: { fileSize: MAX_RESTORE_BYTES, files: 1 },
    }),
  )
  async restore(@UploadedFile() file: UploadedDbFile | undefined, @CurrentUser() user: RequestUser) {
    if (!file) throw new BadRequestException('No file was uploaded.')
    return this.settings.restoreFromUpload(file.path, user)
  }
}
