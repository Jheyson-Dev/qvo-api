import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode, ErrorCodeType } from '../constants/error-codes.constant';
import { ErrorResponse } from '../interfaces/error-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocurrió un error inesperado en el servidor.';
    let errorCode: ErrorCodeType = ErrorCode.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      // Tipado estricto y seguro en lugar de 'any'
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && responseBody !== null) {
        const bodyObj = responseBody as Record<string, unknown>;

        if (typeof bodyObj.message === 'string') {
          message = bodyObj.message;
        } else if (
          Array.isArray(bodyObj.message) &&
          bodyObj.message.length > 0
        ) {
          // A veces NestJS devuelve un array de strings en errores de validación internos
          message = String(bodyObj.message[0]);
        }
      }
      if (status === HttpStatus.NOT_FOUND) errorCode = ErrorCode.NOT_FOUND;
      else if (status === HttpStatus.UNAUTHORIZED)
        errorCode = ErrorCode.UNAUTHORIZED;
      else if (status === HttpStatus.BAD_REQUEST)
        errorCode = ErrorCode.BAD_REQUEST;
      else errorCode = ErrorCode.INTERNAL_SERVER_ERROR; // Default fallback for other HTTP exceptions
    } else {
      // Ocultar detalles técnicos si es 500, pero imprimir en consola (ideal usar Logger aquí)
      console.error('[GlobalExceptionFilter] Unhandled Error:', exception);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
