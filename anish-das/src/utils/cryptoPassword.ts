import crypto from "crypto";

/**
 * Enterprise PBKDF2 Password Hashing for Workspace Security Passcodes
 */
export function hashWorkspacePassword(password: string): string {
  if (!password || !password.trim()) return "";
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password.trim(), salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyWorkspacePassword(password: string, combinedHash?: string | null): boolean {
  if (!combinedHash || typeof combinedHash !== "string" || !combinedHash.includes(":")) {
    return false;
  }
  const [salt, originalHash] = combinedHash.split(":");
  if (!salt || !originalHash) return false;

  const hash = crypto.pbkdf2Sync(password.trim(), salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

