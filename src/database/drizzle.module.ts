import { Global, Module } from '@nestjs/common';
import { drizzleProvider } from './drizzle.provider';
import { DB_CONNECTION } from './database.constants';

@Global()
@Module({
  providers: [drizzleProvider],
  exports: [DB_CONNECTION],
})
export class DrizzleModule {}
