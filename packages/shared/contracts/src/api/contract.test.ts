import { describe, expect, it } from 'vitest'
import { apiContract } from './contract'

describe('api contract', () => {
  it('exposes every route the client and the server have to agree on', () => {
    expect(Object.keys(apiContract).sort()).toEqual(['health', 'notes'])
    expect(Object.keys(apiContract.notes).sort()).toEqual(['create', 'getById', 'list', 'update'])
  })
})
