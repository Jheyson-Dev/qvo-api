import { Global, Module } from '@nestjs/common';
import { HashingService } from './hashing.service';
import { TokenService } from './token.service';

@Global()
@Module({
  providers: [HashingService, TokenService],
  exports: [HashingService, TokenService],
})
export class SecurityModule {}
