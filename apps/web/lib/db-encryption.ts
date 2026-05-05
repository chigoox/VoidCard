import "server-only";

export function getDbEncryptionKey() {
  const key = process.env.VCARD_DB_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("VCARD_DB_ENCRYPTION_KEY missing");
  }
  return key;
}