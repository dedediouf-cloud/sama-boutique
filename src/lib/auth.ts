import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

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
            role: "admin",
            ownerId: user.id,
          };
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
