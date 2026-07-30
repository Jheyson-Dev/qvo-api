import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

export type DrizzleDb = PostgresJsDatabase<typeof schema>;
export type DrizzleTx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];
export type DbOrTx = DrizzleDb | DrizzleTx;
