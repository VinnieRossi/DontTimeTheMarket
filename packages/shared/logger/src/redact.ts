/**
 * Keys whose values never reach a log sink. Logs are shipped, retained, and read by more
 * people than the database ever is, so a credential in a log line has a much wider blast
 * radius than the same value at rest. Matching is case-insensitive and substring-based,
 * because the failure mode to defend against is a field nobody thought to name here.
 */
const REDACTED_KEY_FRAGMENTS = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'credential',
  'privatekey',
  'private_key',
  'sessionid',
  'session_id',
  'ssn',
  'creditcard',
  'credit_card',
  'cardnumber',
  'card_number',
  'cvv',
] as const

export const REDACTED = '[redacted]'

/** How deep redaction walks a nested object before it stops and replaces the rest. */
const MAX_DEPTH = 6

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll('-', '')
  return REDACTED_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Replace the value of every credential-shaped key with a placeholder, recursively. An Error
 * is reduced to its name, message, and code rather than serialized whole, because an error
 * object routinely carries the request that produced it.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return REDACTED
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code
    return {
      name: value.name,
      message: value.message,
      ...(typeof code === 'string' ? { code } : {}),
    }
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  if (!isPlainObject(value)) return value

  const output: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value)) {
    output[key] = isSensitiveKey(key) ? REDACTED : redact(nested, depth + 1)
  }
  return output
}
