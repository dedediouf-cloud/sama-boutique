import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface User extends DefaultUser {
    shopName?: string;
    shopSlug?: string;
    phone?: string;
    logoUrl?: string | null;
    role?: string;
    ownerId?: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      shopName?: string | null;
      shopSlug?: string | null;
      phone?: string | null;
      logoUrl?: string | null;
      role?: string | null;
      ownerId?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    shopName?: string;
    shopSlug?: string;
    phone?: string;
    logoUrl?: string | null;
    role?: string;
    ownerId?: string;
  }
}

// Re-export extended user type for safe casts (helps TS resolution on Vercel)
export type ExtendedUser = DefaultUser & {
  id: string;
  email?: string | null;
  name?: string | null;
  shopName?: string | null;
  shopSlug?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  role?: string | null;
  ownerId?: string | null;
};

export type ExtendedSession = DefaultSession & {
  user: ExtendedUser;
};
