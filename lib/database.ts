import { drizzle } from 'drizzle-orm/node-postgres';

export const database = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.DATABASE_POOL_MAX ?? 1),
        ssl: true,
    },
});
