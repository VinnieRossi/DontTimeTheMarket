import { createRecordingLogger } from '@dttm/logger'
import { describe, expect, it } from 'vitest'
import { LoggingMailProvider } from './logging-mail-provider'
import { RecordingMailProvider } from './recording-mail-provider'

const message = { to: 'reader@example.com', subject: 'A note', text: 'Body' }

describe('RecordingMailProvider', () => {
  it('keeps what was sent, so a test can assert on the message rather than on a call', async () => {
    const mail = new RecordingMailProvider()
    const result = await mail.send(message)

    expect(result.ok).toBe(true)
    expect(mail.sent).toEqual([message])
  })

  it('hands back a distinct identifier per message', async () => {
    const mail = new RecordingMailProvider()
    const first = await mail.send(message)
    const second = await mail.send(message)

    if (first.ok && second.ok) expect(first.value.messageId).not.toBe(second.value.messageId)
  })

  it('fails once when told to, so the retry path can be driven deliberately', async () => {
    const mail = new RecordingMailProvider()
    mail.failOnce('the address was rejected')

    const failed = await mail.send(message)
    expect(failed.ok).toBe(false)
    if (!failed.ok) {
      expect(failed.error.code).toBe('EXTERNAL_SERVICE_ERROR')
      expect(failed.error.message).toBe('the address was rejected')
    }
    expect(mail.sent).toHaveLength(0)

    const recovered = await mail.send(message)
    expect(recovered.ok).toBe(true)
  })

  it('forgets everything when cleared, so one test cannot see another test mail', async () => {
    const mail = new RecordingMailProvider()
    await mail.send(message)
    mail.clear()
    expect(mail.sent).toHaveLength(0)
  })
})

describe('LoggingMailProvider', () => {
  it('writes the recipient and subject to the log and reports success', async () => {
    const { logger, records } = createRecordingLogger('mail')
    const result = await new LoggingMailProvider(logger).send(message)

    expect(result.ok).toBe(true)
    expect(records[0]?.fields).toMatchObject({
      to: 'reader@example.com',
      subject: 'A note',
    })
  })

  it('does not write the body, which is the part most likely to carry personal data', async () => {
    const { logger, records } = createRecordingLogger('mail')
    await new LoggingMailProvider(logger).send(message)

    expect(JSON.stringify(records[0])).not.toContain('Body')
  })
})
