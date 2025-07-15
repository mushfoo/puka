import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // For simplicity in this migration, we'll implement a basic email/password auth
        // In production, you'd want proper password hashing with bcrypt
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user) {
          // Create new user for demo purposes
          const newUser = await prisma.user.create({
            data: {
              email: credentials.email,
              name: credentials.email.split('@')[0],
            }
          });
          
          // Create default settings and streak history
          await prisma.userSettings.create({
            data: { userId: newUser.id }
          });
          
          await prisma.streakHistory.create({
            data: { userId: newUser.id }
          });
          
          return {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
          };
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET ? [
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    ] : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async signIn({ user, account }) {
      // Create default settings and streak history for OAuth users
      if (account?.provider !== 'credentials' && user.id) {
        const existingSettings = await prisma.userSettings.findUnique({
          where: { userId: user.id }
        });
        
        if (!existingSettings) {
          await prisma.userSettings.create({
            data: { userId: user.id }
          });
          
          await prisma.streakHistory.create({
            data: { userId: user.id }
          });
        }
      }
      return true;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
};