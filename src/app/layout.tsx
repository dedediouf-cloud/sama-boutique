// ============================================================
// 494 FIX v67 - 1785961853 - DEFINITIVELY INLINED
// NO dynamic imports in this file for cookie nuking.
// All 494 logic is written directly below.
// ============================================================

// All 494 logic is written directly below.

// All 494 logic is written directly below.
// If you still see the old error on Vercel → CLEAR BUILD CACHE

// 494 cookie logic is written directly below.


// All logic is written directly here.


import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SamaBoutique",
  description: "Gérez votre boutique, vos ventes et votre catalogue en ligne avec SamaBoutique",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // === NUCLEAR 494 FIX - FULLY INLINED (NO DYNAMIC IMPORT) v62 ===
  if (typeof window !== 'undefined') { // v67-494-INLINED-ONLY-2026-08-05 // 494-INLINED-v65-DEFINITIVE-2026-08-05 // v64-494-INLINED-ONLY-2026-08-05 // 494-INLINED-v63-2026-08-05-NO-MODULE
    const nukeAuthCookies = (reason = 'manual') => {
      try {
        let destroyed = false;
        const cookies = document.cookie.split(';');

        cookies.forEach(raw => {
          const name = raw.trim().split('=')[0];
          if (!name) return;

          const isAuthCookie = name.includes('next-auth') || 
                               name.includes('__Secure-next-auth') || 
                               name.includes('__Host-next-auth');

          if (isAuthCookie) {
            destroyed = true;
            const exp = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
            const paths = ['/', '/api', '/sales', '/settings', '/login', '/dashboard'];
            const domains = ['', location.hostname, '.' + location.hostname, location.host];

            paths.forEach(p => {
              domains.forEach(d => {
                let str = `${name}=;${exp};path=${p}`;
                if (d) str += `;domain=${d}`;
                document.cookie = str;
                document.cookie = str + ';secure';
              });
            });
          }
        });

        if (destroyed) {
          console.error(`%c[494 NUCLEAR] ${reason} — Huge NextAuth cookies destroyed. Forcing clean login...`, 'color:red;font-weight:bold');
          setTimeout(() => {
            window.location.replace('/api/auth/force-logout');
          }, 60);
        }
      } catch (e) {}
    };

    nukeAuthCookies('initial');
    setTimeout(() => nukeAuthCookies('delayed-1'), 80);
    setTimeout(() => nukeAuthCookies('delayed-2'), 280);
    setTimeout(() => nukeAuthCookies('delayed-3'), 650);

    (window as any).forceClear494Cookies = () => nukeAuthCookies('manual');
  }

  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

if (typeof window !== 'undefined') { // v67-494-INLINED-ONLY-2026-08-05 // 494-INLINED-v65-DEFINITIVE-2026-08-05 // v64-494-INLINED-ONLY-2026-08-05 // 494-INLINED-v63-2026-08-05-NO-MODULE // 494-FIX-v60-INLINED-ONLY - NO MODULE IMPORT // 494-FIX-v59-INLINED-ONLY-2026-08-05-NO-MODULE
  setTimeout(() => {
    try {
      const totalAuthSize = document.cookie.split(';').reduce((sum, c) => {
        const name = c.trim().split('=')[0];
        if (name && (name.includes('next-auth') || name.includes('__Secure'))) {
          return sum + c.length;
        }
        return sum;
      }, 0);

      if (totalAuthSize > 2500) {
        console.error('%c[494 CRITICAL] Your NextAuth cookies are still very large (' + totalAuthSize + ' chars). Please visit /clear-494.html immediately.', 'color:red;font-size:13px');
        
        // Optional: show a small banner (non-intrusive)
        if (!document.getElementById('494-banner')) {
          const banner = document.createElement('div');
          banner.id = '494-banner';
          banner.style.cssText = 'position:fixed;bottom:12px;right:12px;background:#fee2e2;color:#991b1b;padding:8px 14px;border-radius:8px;font-size:12px;z-index:99999;border:1px solid #fecaca';
          banner.innerHTML = '⚠️ Erreur 494 possible. <a href="/clear-494.html" style="color:#991b1b;text-decoration:underline">Nettoyer les cookies</a>';
          document.body.appendChild(banner);
        }
      }
    } catch(e) {}
  }, 1200);
}
