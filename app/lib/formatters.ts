export function formatDesignTitle(title?: string | null): string {
  if (!title) return ''

  return title.trim().toUpperCase()
}
