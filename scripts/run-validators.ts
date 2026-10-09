import { fail, heading, pass, sh } from './lib/proc'

/**
 * Every standalone validator, without the slow steps. This is what a person runs while they
 * work; `pnpm verify` is what the hooks and CI run.
 */
const VALIDATORS = [
  'scripts/validate-architecture.ts',
  'scripts/validate-reviewability.ts',
  'scripts/validate-no-suppressions.ts',
  'scripts/validate-writing.ts',
  'scripts/validate-instructions.ts',
] as const

const staged = process.argv.includes('--staged')
const failures: string[] = []

for (const validator of VALIDATORS) {
  heading(validator)
  const args = staged ? ['exec', 'tsx', validator, '--staged'] : ['exec', 'tsx', validator]
  if (!sh('pnpm', args)) failures.push(validator)
}

if (failures.length > 0) {
  fail(`Validators failed: ${failures.join(', ')}`)
  process.exit(1)
}
pass('All validators passed')
