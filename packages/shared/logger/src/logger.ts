import { redact } from './redact'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const LEVELS = ['debug', 'info', 'warn', 'error'] as const

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value)
}

export type LogFields = Record<string, unknown>

export interface LogRecord {
  readonly level: LogLevel
  readonly context: string
  readonly message: string
  readonly fields?: LogFields
}

/** Receives finished records. Where they go is the sink's business, not the logger's. */
export type LogSink = (record: LogRecord) => void

export interface LoggerOptions {
  level?: LogLevel
  sink?: LogSink
}

/** Reads LOG_LEVEL where a process environment exists, so the logger stays browser-safe. */
function defaultLevel(): LogLevel {
  const fromEnv = globalThis.process?.env?.['LOG_LEVEL']
  return isLogLevel(fromEnv) ? fromEnv : 'info'
}

/** One JSON object per line in production, and the same shape everywhere else. */
function consoleSink(record: LogRecord): void {
  const line = JSON.stringify({ time: new Date().toISOString(), ...record })
  if (record.level === 'error') console.error(line)
  else if (record.level === 'warn') console.warn(line)
  else console.info(line)
}

/**
 * The one logger. Every field written through it passes redaction, so a caller cannot leak a
 * credential by logging a whole request or config object. The sink is injectable, which is
 * what lets a test assert on records instead of scraping stdout.
 */
export class Logger {
  private readonly context: string
  private readonly level: LogLevel
  private readonly sink: LogSink
  private readonly bound: LogFields

  constructor(context: string, options: LoggerOptions = {}, bound: LogFields = {}) {
    this.context = context
    this.level = options.level ?? defaultLevel()
    this.sink = options.sink ?? consoleSink
    this.bound = bound
  }

  /**
   * A nested logger named `parent:child`, carrying the parent's bound fields plus any new
   * ones. One of these per request is how every line written under it carries the request id.
   */
  child(context: string, fields: LogFields = {}): Logger {
    return new Logger(
      `${this.context}:${context}`,
      { level: this.level, sink: this.sink },
      { ...this.bound, ...fields }
    )
  }

  private emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.level]) return
    const merged = { ...this.bound, ...fields }
    const hasFields = Object.keys(merged).length > 0
    this.sink(
      hasFields
        ? { level, context: this.context, message, fields: redact(merged) as LogFields }
        : { level, context: this.context, message }
    )
  }

  debug(message: string, fields?: LogFields): void {
    this.emit('debug', message, fields)
  }

  info(message: string, fields?: LogFields): void {
    this.emit('info', message, fields)
  }

  warn(message: string, fields?: LogFields): void {
    this.emit('warn', message, fields)
  }

  error(message: string, fields?: LogFields): void {
    this.emit('error', message, fields)
  }
}

export function getLogger(context: string, options?: LoggerOptions): Logger {
  return new Logger(context, options)
}

/** A logger that keeps every record it was given, for tests that assert on log output. */
export function createRecordingLogger(context = 'test'): {
  logger: Logger
  records: LogRecord[]
} {
  const records: LogRecord[] = []
  const logger = new Logger(context, { level: 'debug', sink: (record) => records.push(record) })
  return { logger, records }
}
