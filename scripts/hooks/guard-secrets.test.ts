import { describe, expect, it } from 'vitest'
import { ALLOW, BLOCK, bashPayload, runHook } from './run-hook'

const HOOK = 'guard-secrets.ts'

describe('secret guard', () => {
  it('allows reading an ordinary file', () => {
    expect(runHook(HOOK, { tool_name: 'Read', file_path: 'README.md' }).exitCode).toBe(ALLOW)
  })

  it('allows the example environment file, which is the one meant to be read', () => {
    expect(runHook(HOOK, { tool_name: 'Read', file_path: '.env.example' }).exitCode).toBe(ALLOW)
  })

  it.each([
    '.env',
    '.env.local',
    'packages/backend/database/.env',
    '/Users/someone/.ssh/id_ed25519',
    'certs/server.pem',
    'config/credentials.json',
  ])('blocks a read of %s', (path) => {
    expect(runHook(HOOK, { tool_name: 'Read', file_path: path }).exitCode).toBe(BLOCK)
  })

  it('blocks a shell command that reads a credential file', () => {
    expect(runHook(HOOK, bashPayload('cat .env.local')).exitCode).toBe(BLOCK)
  })

  it('allows the setup step that copies the example into a local file', () => {
    expect(runHook(HOOK, bashPayload('cp .env.example .env.local')).exitCode).toBe(ALLOW)
  })

  it('allows a script that only mentions a credential path on another line', () => {
    const script = ['printf ".env\\n.env.local\\n" > .gitignore', 'cat .gitignore'].join('\n')
    expect(runHook(HOOK, bashPayload(script)).exitCode).toBe(ALLOW)
  })

  it.each([
    ['a private key', '-----BEGIN RSA PRIVATE KEY-----\nabcdef\n'],
    ['a provider key', 'const key = "sk-abcdefghijklmnopqrstuvwxyz0123"'],
    ['a forge token', 'token: ghp_abcdefghijklmnopqrstuvwxyz0123'],
    ['an access key id', 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE'],
  ])('blocks writing %s into a source file', (_label, content) => {
    const result = runHook(HOOK, {
      tool_name: 'Write',
      file_path: 'packages/shared/env/src/local.ts',
      tool_input: { file_path: 'packages/shared/env/src/local.ts', content },
    })
    expect(result.exitCode).toBe(BLOCK)
    expect(result.stdout).toMatch(/^Blocked:/)
  })

  it('allows a placeholder that only looks like a credential key name', () => {
    const result = runHook(HOOK, {
      tool_name: 'Write',
      file_path: '.env.example',
      tool_input: { file_path: '.env.example', content: 'MAIL_API_KEY=\n' },
    })
    expect(result.exitCode).toBe(ALLOW)
  })

  it('allows a test file to contain the shapes it asserts on', () => {
    const result = runHook(HOOK, {
      tool_name: 'Write',
      file_path: 'scripts/hooks/guard-secrets.test.ts',
      tool_input: {
        file_path: 'scripts/hooks/guard-secrets.test.ts',
        content: 'const sample = "ghp_abcdefghijklmnopqrstuvwxyz0123"',
      },
    })
    expect(result.exitCode).toBe(ALLOW)
  })

  it('allows an empty payload rather than crashing', () => {
    expect(runHook(HOOK, {}).exitCode).toBe(ALLOW)
  })

  it('writes nothing to stderr on the allow path, which a hook runner reads as a failure', () => {
    expect(runHook(HOOK, { tool_name: 'Read', file_path: 'README.md' }).stderr).toBe('')
  })
})
