/**
 * Generate a RFC-4122 compliant v4 UUID.
 * Falls back to non-cryptographic generation when crypto.randomUUID
 * is unavailable (e.g. HTTP pages without a secure context).
 */
export function safeRandomUUID(): string {
  // Fast path: secure context
  if (typeof globalThis.crypto === 'object' &&
      typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  // Fallback: RFC-4122 v4 via getRandomValues
  if (typeof globalThis.crypto === 'object' &&
      typeof globalThis.crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    // Set version (4) and variant (10) bits per RFC 4122 §4.4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0'));
    return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
  }

  // Last resort: time + random (not cryptographically strong)
  const ts = Date.now().toString(16).padStart(8, '0');
  const rand = Math.random().toString(16).slice(2, 14);
  return `${ts}-xxxx-yxxx-yxxx-${rand}`.replace(/[xy]/g, c => {
    const r = Math.floor(Math.random() * 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
