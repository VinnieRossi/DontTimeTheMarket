/**
 * What every hook in this directory shares: reading the payload off stdin, locating the project,
 * and the exit-code contract. Factored here so a payload-shape change is one fix rather than
 * one per hook.
 *
 * The contract, which every hook obeys: exit 0 allows the action, exit 2 blocks it and hands
 * stdout back to the agent as the reason, and any other code is logged and ignored. That last
 * case is why hooks fail open, and why a hook that guards something important is tested against
 * a real payload rather than assumed to work.
 */

export const ALLOW = 0
export const BLOCK = 2

export interface HookPayload {
  tool_name?: string
  file_path?: string
  tool_input?: Record<string, unknown>
  session_id?: string
}

/** Read the whole of stdin. Returns an empty string when nothing was piped in. */
export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * Parse the payload, tolerating anything that is not the JSON object a hook expects. A hook that
 * throws on an unexpected payload exits non-zero for a reason unrelated to what it guards, which
 * reads as a broken hook rather than a blocked action.
 */
export function parsePayload(raw: string): HookPayload {
  if (raw.trim() === '') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as HookPayload) : {}
  } catch {
    return {}
  }
}

/** The command a Bash tool call is about to run, wherever the payload carries it. */
export function bashCommand(payload: HookPayload): string {
  const fromInput = payload.tool_input?.['command']
  return typeof fromInput === 'string' ? fromInput : ''
}

/** The project root. Set by the agent runtime; falls back to the working directory. */
export function projectDir(): string {
  return process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd()
}

/** Block the action and tell the agent why, in terms it can act on. */
export function block(reason: string): never {
  console.log(reason)
  process.exit(BLOCK)
}

export function allow(): never {
  process.exit(ALLOW)
}
