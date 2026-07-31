import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

// Note: We intentionally avoid relying on Prisma generated types for logoUrl
// because Vercel build cache + Turbopack + prisma generate timing often
// causes the TS type to be out-of-sync with schema.prod.prisma during `next build`.


export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1. Chercher d'abord dans les super administrateurs
        const superAdmin = await prisma.superAdmin.findUnique({
          where: { email: credentials.email },
        });

        if (superAdmin) {
          const isValid = await bcrypt.compare(credentials.password, superAdmin.password);
          if (!isValid) return null;

          return {
            id: superAdmin.id,
            email: superAdmin.email,
            name: superAdmin.name,
            shopName: "Super Admin",
            shopSlug: "superadmin",
            phone: undefined,
            role: "superadmin",
            ownerId: superAdmin.id,
          };
        }

        // 2. Chercher dans les commerçants (User)
        // === CRITICAL VERCEL BUILD FIX (logoUrl) ===
        // During `next build` (Turbopack + restored cache), @prisma/client types
        // generated from schema.prod.prisma are STALE and do NOT include `logoUrl`
        // (even though the field exists in schema.prod.prisma + DB).
        //
        // Cast the ENTIRE result to `any` ON THE AWAIT LINE.
        // Then access .logoUrl directly on the `any` variable (TypeScript allows it).
        const user = (await prisma.user.findUnique({
          where: { email: credentials.email },
        })) as any;

        if (user) {
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          if (user.isBlocked) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            shopName: user.shopName,
            shopSlug: user.shopSlug,
            phone: user.phone || undefined,
            // @ts-ignore — CRITICAL VERCEL FIX
            // `user` is cast to `any` on the fetch line above.
            // `logoUrl` exists in schema.prod.prisma + the database.
            // @prisma/client types are stale during `next build`
            // (Turbopack + restored build cache).
            // We force explicit `as any` access here.
            logoUrl: (user as any).logoUrl || undefined,
            role: "admin",
            ownerId: user.id,
          } as any;
        }

        // 3. Chercher dans les employés (Employee)
        const employee = await prisma.employee.findFirst({
          where: { email: credentials.email },
        });

        if (employee) {
          const isValid = await bcrypt.compare(credentials.password, employee.password);
          if (!isValid) return null;

          const owner = await prisma.user.findUnique({
            where: { id: employee.userId },
          });

          if (owner?.isBlocked) return null;

          return {
            id: employee.id,
            email: employee.email,
            name: employee.name,
            shopName: owner?.shopName || "Boutique",
            shopSlug: owner?.shopSlug || "",
            phone: owner?.phone || undefined,
            role: employee.role,
            ownerId: employee.userId,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.shopName = token.shopName as string;
        session.user.shopSlug = token.shopSlug as string;
        session.user.phone = token.phone as string;
        session.user.logoUrl = (token as any).logoUrl ?? null;
        session.user.role = token.role as string;
        session.user.ownerId = token.ownerId as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.shopName = user.shopName;
        token.shopSlug = user.shopSlug;
        token.phone = user.phone;
        token.logoUrl = (user as any).logoUrl || null;
        token.role = user.role;
        token.ownerId = user.ownerId;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
