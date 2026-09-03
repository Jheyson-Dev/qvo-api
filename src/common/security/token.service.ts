import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenService {
  generateOpaqueToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  hashOpaqueToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
