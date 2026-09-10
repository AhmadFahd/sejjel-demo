export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Record<string, unknown>

/**
 * One JSON object per line. Railway, and every other log pipeline, groups a
 * line at a time: a stack trace printed as forty lines becomes forty entries
 * nobody can read, so an error is carried inside the object as a string.
 */
export function formatLogLine(
  level: LogLevel,
  message: string,
  fields: LogFields = {},
  at: Date = new Date(),
): string {
  const entry: LogFields = {
    level,
    time: at.toISOString(),
    message,
    ...serialiseFields(fields),
  }

  return JSON.stringify(entry)
}

function serialiseFields(fields: LogFields): LogFields {
  const out: LogFields = {}

  for (const [key, value] of Object.entries(fields)) {
    if (value instanceof Error) {
      out[key] = describeError(value)
    } else if (value === undefined) {
      continue
    } else {
      out[key] = value
    }
  }

  return out
}

export function describeError(error: unknown): LogFields {
  if (!(error instanceof Error)) return { message: String(error) }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...(error.cause === undefined ? {} : { cause: describeError(error.cause) }),
  }
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  const line = formatLogLine(level, message, fields)
  if (level === 'error' || level === 'warn') console.error(line)
  else console.log(line)
}

export const log = {
  debug: (message: string, fields?: LogFields) =>
    write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) =>
    write('error', message, fields),
}
