import type { MailProvider, SendMailInput, SentMail } from '@dttm/contracts'
import type { Logger } from '@dttm/logger'
import { ok, type Result } from '@dttm/types'

/**
 * Mail written to the log instead of sent. A developer sees what would have gone out, with no
 * account and no risk of mailing a real person from a seeded database.
 *
 * The factory does not select it: `live` refuses any adapter that drops mail, and this one does.
 * A project can wire it deliberately where a log line is enough, and adding a vendor means one more
 * class implementing the same interface, with nothing that sends mail changing.
 */
export class LoggingMailProvider implements MailProvider {
  private readonly logger: Logger
  private counter = 0

  constructor(logger: Logger) {
    this.logger = logger
  }

  send(input: SendMailInput): Promise<Result<SentMail>> {
    this.counter += 1
    const messageId = `logged_${this.counter}`
    this.logger.info('mail written to the log rather than sent', {
      messageId,
      to: input.to,
      subject: input.subject,
    })
    return Promise.resolve(ok({ messageId }))
  }
}
