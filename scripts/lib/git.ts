import { execFileSync } from 'node:child_process'

function git(args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' })
}

/** Files staged for commit: added, copied, modified, or renamed. */
export function stagedFiles(): string[] {
  return git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** Every file git tracks, which is the set CI would see. */
export function trackedFiles(): string[] {
  return git(['ls-files'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** The files a validator should inspect: the staged subset, or everything tracked. */
export function filesToCheck(staged: boolean): string[] {
  return staged ? stagedFiles() : trackedFiles()
}
