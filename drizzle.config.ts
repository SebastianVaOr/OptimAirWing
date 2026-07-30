import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './server/db/migrations',
  schema: './server/db/pgSchema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
