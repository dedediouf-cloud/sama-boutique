export function isAdmin(role?: string | null) {
  return role === "admin";
}

export function isSeller(role?: string | null) {
  return role === "admin" || role === "seller";
}

export function isSuperAdmin(role?: string | null) {
  return role === "superadmin";
}
