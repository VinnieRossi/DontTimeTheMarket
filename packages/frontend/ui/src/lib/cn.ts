type ClassValue = string | false | null | undefined

/** Join the class names that apply, dropping the ones that do not. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
