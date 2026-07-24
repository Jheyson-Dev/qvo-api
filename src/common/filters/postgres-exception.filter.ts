import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes.constant';
import { ErrorResponse } from '../interfaces/error-response.interface';
import { GlobalExceptionFilter } from './global-exception.filter';

@Catch(Error)
export class PostgresExceptionFilter implements ExceptionFilter {
  catch(exception: Error & { code?: string }, host: ArgumentsHost) {
    // Verificamos si es una violación de unicidad de PostgreSQL
    if (exception.code === '23505') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      const status = HttpStatus.CONFLICT;
      const errorResponse: ErrorResponse = {
        statusCode: status,
        errorCode: ErrorCode.UNIQUE_VIOLATION,
        message: 'El registro ya existe o hay un conflicto de unicidad.',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      return response.status(status).json(errorResponse);
    }

    // Si no es un código de base de datos o no es manejable aquí,
    // evitamos romper la cadena instanciando y delegando al filtro global de forma explícita.
    return new GlobalExceptionFilter().catch(exception, host);
  }
}
