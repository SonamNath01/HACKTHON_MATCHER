import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the whole process — avoids each
// controller opening its own connection pool.
export const prisma = new PrismaClient();
