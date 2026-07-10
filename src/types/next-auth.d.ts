import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    shopName?: string;
    shopSlug?: string;
    phone?: string;
    role?: string;
    ownerId?: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      shopName?: string | null;
      shopSlug?: string | null;
      phone?: string | null;
      role?: string | null;
      ownerId?: string | null;
    };
  }
}
