import { drizzle } from 'drizzle-orm/node-postgres';

export const database = drizzle({
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: true
    }
});
