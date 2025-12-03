// Type declarations for @prisma/client when client is not generated
// This allows TypeScript to compile even when Prisma client hasn't been generated yet
// Run `npx prisma generate` to generate the actual client with full type safety

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T>;
    [key: string]: any;
  }
}
