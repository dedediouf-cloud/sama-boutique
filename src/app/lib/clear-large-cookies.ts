// NUCLEAR 494 FIX - Runs as early as possible on EVERY page load
// This is the last line of defense against huge legacy JWT cookies.

export function nukeLargeAuthCookies() {
  if (typeof window === 'undefined') return false;

  try {
    const cookies = document.cookie.split(';');
    let nukedAny = false;
    let totalAuthSize = 0;

    for (const raw of cookies) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const [name, ...rest] = trimmed.split('=');
      const value = rest.join('=');

      const isAuthCookie = name.includes('next-auth') || 
                           name.includes('__Secure-next-auth') || 
                           name.includes('__Host-next-auth');

      if (isAuthCookie) {
        totalAuthSize += value.length;

        // Aggressively nuke ANY next-auth cookie that is > 2.5KB
        if (value.length > 2500) {
          console.warn(`[494 NUCLEAR] Destroying oversized cookie: ${name} (${value.length} chars)`);

          const expires = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
          const paths = ['/', '/api', '/sales', '/settings', '/login'];
          const domains = [window.location.hostname, '.' + window.location.hostname, ''];

          paths.forEach(p => {
            domains.forEach(d => {
              let cookieStr = `${name}=;${expires};path=${p}`;
              if (d) cookieStr += `;domain=${d}`;
              document.cookie = cookieStr;
            });
          });

          nukedAny = true;
        }
      }
    }

    if (nukedAny) {
      console.error('%c[494 NUCLEAR] Huge NextAuth cookies destroyed. Redirecting to force fresh login...', 'color:red;font-weight:bold');
      // Force a full logout + reload so server issues a brand new small JWT
      setTimeout(() => {
        // Clear any remaining local auth state
        try { localStorage.removeItem('next-auth.session-token'); } catch {}
        window.location.replace('/login?force=494&ts=' + Date.now());
      }, 180);
      return true;
    }

    if (totalAuthSize > 1800) {
      console.warn(`[494] Auth cookies are still quite large (${totalAuthSize} bytes). Log out if 494 error continues.`);
    }

    return false;
  } catch (e) {
    console.warn('[494 NUCLEAR] Error during cleanup:', e);
    return false;
  }
}

// Run immediately (before React even hydrates)
if (typeof window !== 'undefined') {
  nukeLargeAuthCookies();
}
