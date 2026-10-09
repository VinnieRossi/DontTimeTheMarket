import type { MailProvider, SendMailInput, SentMail } from '@dttm/contracts'
import { ExternalServiceError, err, ok, type Result } from '@dttm/types'

/**
 * Mail that goes nowhere and remembers everything. It is what runs in mock mode and in tests, so
 * a test can assert on what the system tried to send rather than on whether a method was called,
 * and nothing is ever delivered to a real address by accident.
 */
export class RecordingMailProvider implements MailProvider {
  readonly sent: SendMailInput[] = []
  private failNext: string | null = null
  private counter = 0

  send(input: SendMailInput): Promise<Result<SentMail>> {
    const failure = this.failNext
    if (failure !== null) {
      this.failNext = null
      return Promise.resolve(err(new ExternalServiceError('mail', failure)))
    }
    this.sent.push(input)
    this.counter += 1
    return Promise.resolve(ok({ messageId: `recorded_${this.counter}` }))
  }

  /**
   * Make the next send fail once. Tests need a real failure to drive the retry and dead-letter
   * paths, and an injected one is the only kind that is reproducible.
   */
  failOnce(message: string): void {
    this.failNext = message
  }

  clear(): void {
    this.sent.length = 0
    this.failNext = null
  }
}
