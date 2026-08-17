/**
 * A locally-unique id for client-only React keys (`useFieldArray` rows) —
 * never persisted or sent to the server. `crypto.randomUUID()` requires a
 * secure context, which a LAN device browsing over plain HTTP is not.
 */
export function localId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
