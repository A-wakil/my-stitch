export const ADMIN_EMAILS = [
  'abdulwakil.ola@gmail.com'
]

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return ADMIN_EMAILS.map((item) => item.toLowerCase()).includes(normalized)
}
