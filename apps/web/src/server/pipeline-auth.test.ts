import { afterEach, describe, expect, it } from 'vitest'
import { authorizePipelineRequest } from './pipeline-auth'

/**
 * The drain endpoint makes the application do work, so who may call it matters. These tests cover
 * the case that is easy to get wrong: a caller that says where it is from rather than proving who
 * it is.
 */
function request(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { method: 'POST', headers })
}

afterEach(() => {
  delete process.env['PIPELINE_SECRET']
})

describe('authorizePipelineRequest', () => {
  it('accepts a caller when no secret is configured, which only a local setup can be', () => {
    expect(authorizePipelineRequest(request('http://localhost:3000/api/jobs/drain'))).toEqual({
      allowed: true,
    })
  })

  it('does not trust a caller for claiming to be local once a secret is configured', () => {
    process.env['PIPELINE_SECRET'] = 'a-real-secret'
    expect(
      authorizePipelineRequest(
        request('http://localhost:3000/api/jobs/drain', { host: 'localhost' })
      ).allowed
    ).toBe(false)
  })

  it('accepts the configured secret', () => {
    process.env['PIPELINE_SECRET'] = 'a-real-secret'
    expect(
      authorizePipelineRequest(
        request('https://app.example.com/api/jobs/drain', {
          authorization: 'Bearer a-real-secret',
        })
      )
    ).toEqual({ allowed: true })
  })

  it('refuses a wrong, truncated, or missing secret once one is configured', () => {
    process.env['PIPELINE_SECRET'] = 'a-real-secret'
    for (const authorization of ['Bearer wrong', 'Bearer a-real', 'a-real-secret']) {
      expect(
        authorizePipelineRequest(
          request('https://app.example.com/api/jobs/drain', { authorization })
        ).allowed
      ).toBe(false)
    }
    expect(
      authorizePipelineRequest(request('https://app.example.com/api/jobs/drain')).allowed
    ).toBe(false)
  })
})
