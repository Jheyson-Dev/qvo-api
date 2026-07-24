import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ErrorCode } from '../constants/error-codes.constant';
import {
  ErrorResponse,
  ValidationErrorDetail,
} from '../interfaces/error-response.interface';

@Catch(ZodValidationException)
export class ZodExceptionFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const zodError = exception.getZodError() as ZodError;
    const status = HttpStatus.BAD_REQUEST;

    const validationErrors: ValidationErrorDetail[] = zodError.issues.map(
      (issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }),
    );

    const errorResponse: ErrorResponse = {
      statusCode: status,
      errorCode: ErrorCode.VALIDATION_ERROR,
      message: 'Error de validación en los datos de entrada',
      errors: validationErrors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).send(errorResponse);
  }
}
