import { fail, heading, pass, sh } from './lib/proc'

/**
 * The one gate. The same command runs at pre-commit (its staged subset), at pre-push (whole),
 * and in CI (whole), so "passes locally" and "passes CI" cannot come to mean different things.
 *
 * Add a step here and every caller gets it. That is the point: two entry points meant to run
 * the same checks always drift, the first time somebody adds a check to one of them.
 */
const staged = process.argv.includes('--staged')

interface Step {
  name: string
  run: () => boolean
}

const validators = (): boolean =>
  sh('pnpm', ['exec', 'tsx', 'scripts/run-validators.ts', ...(staged ? ['--staged'] : [])])

const biome = (strict: boolean): boolean =>
  sh('pnpm', ['exec', 'biome', 'check', ...(strict ? ['--error-on-warnings'] : []), '.'])

const turbo = (task: string): boolean => sh('pnpm', ['exec', 'turbo', 'run', task])

/**
 * The staged subset. It runs what fits in the few seconds somebody will wait at a commit: the
 * linter, the validators, and the typecheck, which the task runner caches down to a fraction of a
 * second when nothing it depends on changed.
 *
 * The tests are the one thing left to pre-push. A monorepo-wide suite does not fit in a commit,
 * and running only the tests near the change would report a pass that the whole suite does not
 * agree with, which is the more misleading of the two outcomes.
 */
const stagedSteps: Step[] = [
  { name: 'Lint and format', run: () => biome(false) },
  { name: 'Repository validators', run: validators },
  { name: 'Typecheck', run: () => turbo('typecheck') },
]

/**
 * Functional e2e is part of the gate rather than a CI-only step, because unlike the destructive
 * suite it is patterned on, this one runs against a throwaway in-process database and starts no
 * shared service, so it is exactly as safe here as it is on a laptop.
 */
const fullSteps: Step[] = [
  { name: 'Lint and format', run: () => biome(true) },
  { name: 'Repository validators', run: validators },
  { name: 'Typecheck', run: () => turbo('typecheck') },
  { name: 'Tests with coverage', run: () => turbo('test:coverage') },
  { name: 'Build', run: () => turbo('build') },
  { name: 'Storybook build', run: () => turbo('storybook:build') },
  {
    name: 'Functional e2e browser install',
    run: () => sh('pnpm', ['--filter', '@dttm/e2e', 'install-browsers']),
  },
  { name: 'Functional e2e', run: () => sh('pnpm', ['--filter', '@dttm/e2e', 'test:func']) },
]

const steps = staged ? stagedSteps : fullSteps
heading(`verify ${staged ? '(staged)' : '(full)'}, ${steps.length} steps`)

const failures: string[] = []
for (const step of steps) {
  heading(step.name)
  if (step.run()) pass(step.name)
  else {
    fail(step.name)
    failures.push(step.name)
  }
}

if (failures.length > 0) {
  fail(`Gate failed: ${failures.join(', ')}`)
  process.exit(1)
}
pass('Gate passed')
