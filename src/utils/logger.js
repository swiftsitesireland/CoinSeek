// In release builds __DEV__ is false — all log output is suppressed so
// internal Supabase error messages, table names, and stack traces are
// never visible via USB debugging or Flipper on a user's device.
const noop = () => {};

export const logger = __DEV__
  ? { log: console.log, warn: console.warn, error: console.error }
  : { log: noop, warn: noop, error: noop };
