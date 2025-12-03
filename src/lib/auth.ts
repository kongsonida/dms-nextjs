import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { Role } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: Role;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('Account is disabled');
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        // Log the login
        await prisma.auditLog.create({
          data: {
            action: 'LOGIN',
            entityType: 'user',
            entityId: user.id,
            userId: user.id,
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Role-based access control helpers
export function canManageUsers(role: Role): boolean {
  return role === 'ADMIN';
}

export function canManageDocuments(role: Role): boolean {
  return ['ADMIN', 'MANAGER', 'EDITOR'].includes(role);
}

export function canEditDocuments(role: Role): boolean {
  return ['ADMIN', 'MANAGER', 'EDITOR'].includes(role);
}

export function canViewDocuments(role: Role): boolean {
  return ['ADMIN', 'MANAGER', 'EDITOR', 'VIEWER'].includes(role);
}

export function canDeleteDocuments(role: Role): boolean {
  return ['ADMIN', 'MANAGER'].includes(role);
}

export function canShareDocuments(role: Role): boolean {
  return ['ADMIN', 'MANAGER', 'EDITOR'].includes(role);
}

export function canManageWorkflows(role: Role): boolean {
  return ['ADMIN', 'MANAGER'].includes(role);
}

export function canApproveDocuments(role: Role): boolean {
  return ['ADMIN', 'MANAGER'].includes(role);
}

export function canAccessAdmin(role: Role): boolean {
  return role === 'ADMIN';
}
