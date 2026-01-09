// Store user role in memory for permission checks
let currentUserRole: string | null = null

export function setUserRole(role: string): void {
  currentUserRole = role
}

export function getUserRole(): string | null {
  return currentUserRole
}
