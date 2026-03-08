import { dbSchema } from './src/lib/drizzle/index.ts';
console.log('Schema keys:', Object.keys(dbSchema));
console.log('Customers table:', dbSchema.customers);
