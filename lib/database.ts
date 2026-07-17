import { drizzle } from 'drizzle-orm/node-postgres';
import { env } from '@/lib/env';

export const database = drizzle({
    connection: {
        connectionString: env.DATABASE_URL,
        max: env.DATABASE_POOL_MAX ?? 1,
        ssl: true,
    },
});
