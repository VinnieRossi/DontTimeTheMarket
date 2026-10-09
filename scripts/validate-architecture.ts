import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { report } from './lib/proc'
import { ALLOWED_DEPENDENCIES, INTERNAL_SCOPE, UNIVERSAL_DEPENDENCIES } from './package-graph'

/**
 * Enforces the dependency direction the architecture note declares. A documented rule that
 * nothing checks is a suggestion, and an agent under pressure will eventually import a service
 * into a component to get something working.
 */

interface Manifest {
  name?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
}

const SEARCH_ROOTS = ['apps', 'packages', 'scripts']
const SKIP = new Set(['node_modules', 'dist', '.next', '.turbo', 'coverage', 'storybook-static'])

/** Every directory holding a package.json, without descending into one. */
function findManifests(dir: string): string[] {
  const manifest = join(dir, 'package.json')
  if (existsSync(manifest)) return [manifest]
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || SKIP.has(entry.name)) continue
    found.push(...findManifests(join(dir, entry.name)))
  }
  return found
}

function internalDeps(manifest: Manifest): string[] {
  const all = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  }
  return Object.keys(all)
    .filter((name) => name.startsWith(INTERNAL_SCOPE))
    .sort()
}

/**
 * A cycle means no package in it can be understood, tested, or replaced on its own, so it is
 * reported as its own violation rather than left for someone to notice.
 */
function findCycle(graph: Map<string, string[]>): string[] | null {
  const state = new Map<string, 'open' | 'closed'>()
  const stack: string[] = []

  function walk(node: string): string[] | null {
    if (state.get(node) === 'closed') return null
    if (state.get(node) === 'open') return [...stack.slice(stack.indexOf(node)), node]
    state.set(node, 'open')
    stack.push(node)
    for (const next of graph.get(node) ?? []) {
      const cycle = walk(next)
      if (cycle) return cycle
    }
    stack.pop()
    state.set(node, 'closed')
    return null
  }

  for (const node of graph.keys()) {
    const cycle = walk(node)
    if (cycle) return cycle
  }
  return null
}

const violations: string[] = []
const graph = new Map<string, string[]>()
let inspected = 0

for (const root of SEARCH_ROOTS) {
  if (!existsSync(root)) continue
  for (const path of findManifests(root)) {
    const manifest = JSON.parse(readFileSync(path, 'utf8')) as Manifest
    const name = manifest.name
    if (name === undefined) {
      violations.push(`${path}: package.json has no name`)
      continue
    }
    inspected += 1
    const deps = internalDeps(manifest)
    graph.set(
      name,
      deps.filter((dep) => !UNIVERSAL_DEPENDENCIES.includes(dep))
    )

    const allowed = ALLOWED_DEPENDENCIES[name]
    if (allowed === undefined) {
      violations.push(
        `${name} is not registered in scripts/package-graph.ts, so nobody has reviewed what it may depend on`
      )
      continue
    }
    for (const dep of deps) {
      if (UNIVERSAL_DEPENDENCIES.includes(dep)) continue
      if (!allowed.includes(dep)) {
        violations.push(`${name} depends on ${dep}, which is not in its allowed list`)
      }
    }
  }
}

if (inspected === 0) {
  violations.push('found no package manifests to inspect, so this check proved nothing')
}

const cycle = findCycle(graph)
if (cycle) violations.push(`dependency cycle: ${cycle.join(' -> ')}`)

report(
  'Architecture',
  violations,
  `Architecture: ${inspected} packages, direction and cycles clean`
)
