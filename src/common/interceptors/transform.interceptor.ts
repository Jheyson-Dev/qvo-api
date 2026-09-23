import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiResponse } from '#common/interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    return next.handle().pipe(
      map((res: unknown) => {
        const statusCode = response.statusCode;

        let data: unknown = res;
        let meta: unknown = undefined;
        let message: string | undefined = undefined;

        if (res && typeof res === 'object' && !Array.isArray(res)) {
          const resObj = res as Record<string, unknown>;
          if (
            resObj.data !== undefined ||
            resObj.meta !== undefined ||
            resObj.message !== undefined
          ) {
            data = resObj.data;
            meta = resObj.meta;
            message =
              typeof resObj.message === 'string' ? resObj.message : undefined;
          }
        }

        return {
          success: true,
          statusCode,
          path: request.url,
          timestamp: new Date().toISOString(),
          ...(message ? { message } : {}),
          ...(data !== undefined ? { data } : {}),
          ...(meta ? { meta } : {}),
        } as ApiResponse<T>;
      }),
    );
  }
}
