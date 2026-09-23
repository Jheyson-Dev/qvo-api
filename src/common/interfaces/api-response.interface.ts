import { ErrorCodeType } from '#common/constants/error-codes.constant';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  path: string;
  timestamp: string;

  data?: T;

  meta?: {
    pagination?: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    filters?: Record<string, any>;
    [key: string]: any;
  };

  message?: string;
  errorCode?: ErrorCodeType;
  errors?: ValidationErrorDetail[];
  traceId?: string;
}
