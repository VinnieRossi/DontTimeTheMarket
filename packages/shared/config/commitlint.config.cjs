/**
 * Conventional Commits, with scopes mirroring the internal package names so the
 * history stays greppable by package.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      1,
      'always',
      [
        'config',
        'types',
        'utils',
        'validation',
        'engine',
        'theme',
        'ui',
        'hooks',
        'web',
        'e2e',
        'scripts',
        'agents',
        'ci',
        'deps',
      ],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
  },
}
