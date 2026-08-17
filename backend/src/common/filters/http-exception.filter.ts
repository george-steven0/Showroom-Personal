import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from '@prisma/client'

interface ErrorBody {
  statusCode: number
  message: string
  error: string
  field?: string
}

/**
 * Turns every thrown error — Nest's own HttpException, a raw Prisma error, or anything
 * unexpected — into the one JSON shape the frontend's `errorMessage()` helper reads:
 * `{ statusCode, message, error }`. Also the one place that guarantees a stack trace or a
 * SQL fragment never reaches a client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const body = this.toErrorBody(exception)

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception))
    }

    response.status(body.statusCode).json(body)
  }

  private toErrorBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const payload = exception.getResponse()

      if (typeof payload === 'string') {
        return { statusCode: status, message: payload, error: exception.name }
      }

      const record = payload as Record<string, unknown>
      const message = Array.isArray(record.message) ? String(record.message[0]) : String(record.message ?? exception.message)

      return {
        statusCode: status,
        message,
        error: String(record.error ?? exception.name),
        field: typeof record.field === 'string' ? record.field : undefined,
      }
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrismaError(exception)
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unexpected error occurred.', error: 'Internal Server Error' }
  }

  private fromPrismaError(exception: Prisma.PrismaClientKnownRequestError): ErrorBody {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | undefined)?.join(', ')
        return {
          statusCode: HttpStatus.CONFLICT,
          message: target ? `A record with this ${target} already exists.` : 'A record with these values already exists.',
          error: 'Conflict',
        }
      }
      case 'P2003':
        return { statusCode: HttpStatus.CONFLICT, message: 'This record is referenced elsewhere and cannot be changed.', error: 'Conflict' }
      case 'P2025':
        return { statusCode: HttpStatus.NOT_FOUND, message: 'The requested record no longer exists.', error: 'Not Found' }
      default:
        this.logger.error(`Unhandled Prisma error ${exception.code}: ${exception.message}`)
        return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'A database error occurred.', error: 'Internal Server Error' }
    }
  }
}
