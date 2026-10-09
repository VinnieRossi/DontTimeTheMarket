import { spawnSync } from 'node:child_process'

/** Run a command with its output streaming through. True when it exited zero. */
export function sh(command: string, args: string[]): boolean {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) {
    console.error(`Could not start: ${command} ${args.join(' ')}`)
    return false
  }
  return (result.status ?? 1) === 0
}

export function heading(text: string): void {
  console.log(`\n== ${text}`)
}

export function pass(text: string): void {
  console.log(`  ok    ${text}`)
}

export function fail(text: string): void {
  console.error(`  FAIL  ${text}`)
}

export function info(text: string): void {
  console.log(`        ${text}`)
}

/** Print a validator's violations and exit non-zero, or print the pass line and return. */
export function report(label: string, violations: string[], passed: string): void {
  if (violations.length > 0) {
    fail(label)
    for (const violation of violations) console.error(`        ${violation}`)
    process.exit(1)
  }
  pass(passed)
}
