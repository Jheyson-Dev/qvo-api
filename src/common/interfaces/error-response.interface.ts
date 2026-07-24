import { ErrorCodeType } from '../constants/error-codes.constant';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ErrorResponse {
  statusCode: number;
  errorCode: ErrorCodeType;
  message: string;
  errors?: ValidationErrorDetail[];
  timestamp: string;
  path: string;
  traceId?: string;
}
