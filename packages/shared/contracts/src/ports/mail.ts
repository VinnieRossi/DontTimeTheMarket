import type { Result } from '@dttm/types'

/**
 * What this application needs from an email service, described without reference to any vendor.
 * The interface is deliberately narrower than any provider's API: it describes the need, so
 * swapping providers is a configuration change rather than a rewrite of everything that sends.
 */

export interface SendMailInput {
  to: string
  subject: string
  text: string
}

export interface SentMail {
  /** The provider's identifier for the message, for correlating a later delivery report. */
  messageId: string
}

export interface MailProvider {
  /**
   * Send one message. A provider failure arrives through the Result error channel as this
   * codebase's own error type, never as the vendor's, so no caller learns which vendor is behind
   * the port.
   */
  send(input: SendMailInput): Promise<Result<SentMail>>
}
