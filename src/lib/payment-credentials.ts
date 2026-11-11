import "server-only";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodeBase64(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Copy bytes into a definite ArrayBuffer. TypeScript's Uint8Array type may
 * otherwise expose ArrayBufferLike (including SharedArrayBuffer), while
 * Web Crypto's BufferSource definitions require an ArrayBuffer here.
 */
function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function getEncryptionKey() {
  const configured = process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY;
  if (!configured) throw new Error("Payment credential encryption is not configured.");
  const raw = decodeBase64(configured);
  if (raw.byteLength !== 32) throw new Error("Payment credential encryption key must be 32 bytes.");
  return crypto.subtle.importKey("raw", toArrayBuffer(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptPaymentCredentials(credentials: Record<string, string>) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey();
  const plaintext = encoder.encode(JSON.stringify(credentials));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(plaintext),
  );
  return { credential_ciphertext: encodeBase64(new Uint8Array(encrypted)), credential_iv: encodeBase64(iv) };
}

export async function decryptPaymentCredentials(ciphertext: string, iv: string) {
  const key = await getEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(decodeBase64(iv)) },
    key,
    toArrayBuffer(decodeBase64(ciphertext)),
  );
  return JSON.parse(decoder.decode(plaintext)) as Record<string, string>;
}
