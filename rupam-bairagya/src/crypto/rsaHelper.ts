export interface WorkspaceKeyPair {
  publicKeyPem: string;
  privateKeyPem: string;
  keyFingerprint: string;
}

const KEY_STORAGE_PREFIX = "ledgerguard_rsa_keys_";
const pendingWorkspaceKeyGen = new Map<string, Promise<WorkspaceKeyPair>>();

/**
 * Zero-Knowledge Asymmetric Cryptographic Helper
 * Generates in-browser RSA-PSS / RSA-SHA256 keypairs and signs transaction payloads.
 */
export class RsaCryptoHelper {
  private static normalizeTenantId(tenantId?: string): string {
    return (tenantId || "acme_corp").toLowerCase().trim() || "acme_corp";
  }

  public static getStoredKeyPair(tenantId?: string): WorkspaceKeyPair | null {
    if (typeof window === "undefined") return null;
    try {
      const key = `${KEY_STORAGE_PREFIX}${this.normalizeTenantId(tenantId)}`;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.publicKeyPem === "string" &&
        typeof parsed.privateKeyPem === "string" &&
        typeof parsed.keyFingerprint === "string" &&
        parsed.publicKeyPem &&
        parsed.privateKeyPem &&
        parsed.keyFingerprint
      ) {
        return {
          publicKeyPem: parsed.publicKeyPem,
          privateKeyPem: parsed.privateKeyPem,
          keyFingerprint: parsed.keyFingerprint,
        };
      }
    } catch {
      // Ignore invalid stored key payloads
    }
    return null;
  }

  private static saveKeyPair(tenantId: string | undefined, pair: WorkspaceKeyPair): void {
    if (typeof window === "undefined") return;
    try {
      const key = `${KEY_STORAGE_PREFIX}${this.normalizeTenantId(tenantId)}`;
      localStorage.setItem(key, JSON.stringify(pair));
    } catch {
      // Ignore storage quota errors
    }
  }

  public static async getOrCreateWorkspaceKeyPair(tenantId?: string): Promise<WorkspaceKeyPair> {
    const existing = this.getStoredKeyPair(tenantId);
    if (existing) {
      return existing;
    }

    const normalized = this.normalizeTenantId(tenantId);
    const inFlight = pendingWorkspaceKeyGen.get(normalized);
    if (inFlight) {
      return inFlight;
    }

    const genPromise = this.generateKeyPair()
      .then((pair) => {
        this.saveKeyPair(normalized, pair);
        return pair;
      })
      .finally(() => {
        pendingWorkspaceKeyGen.delete(normalized);
      });

    pendingWorkspaceKeyGen.set(normalized, genPromise);
    return genPromise;
  }

  public static async rotateWorkspaceKeyPair(tenantId?: string): Promise<WorkspaceKeyPair> {
    const normalized = this.normalizeTenantId(tenantId);
    const inFlight = pendingWorkspaceKeyGen.get(normalized);
    if (inFlight) {
      await inFlight.catch(() => undefined);
    }

    const rotated = await this.generateKeyPair();
    this.saveKeyPair(normalized, rotated);
    return rotated;
  }

  public static async generateKeyPair(): Promise<WorkspaceKeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    const publicKeyPem = this.toPem(exportedPublic, "PUBLIC KEY");
    const privateKeyPem = this.toPem(exportedPrivate, "PRIVATE KEY");

    const digest = await window.crypto.subtle.digest("SHA-256", exportedPublic);
    const keyFingerprint = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(":")
      .substring(0, 47);

    return { publicKeyPem, privateKeyPem, keyFingerprint };
  }

  public static async signRawString(privateKeyPem: string, rawString: string): Promise<string> {
    const privateKey = await this.importPrivateKey(privateKeyPem);
    const encodedData = new TextEncoder().encode(rawString);
    const signatureBuffer = await window.crypto.subtle.sign(
      { name: "RSASSA-PKCS1-v1_5" },
      privateKey,
      encodedData
    );
    return this.arrayBufferToBase64(signatureBuffer);
  }

  public static async signPayload(privateKeyPem: string, data: Record<string, unknown>): Promise<string> {
    return this.signRawString(privateKeyPem, JSON.stringify(data));
  }

  public static async verifyRawString(
    publicKeyPem: string,
    signatureBase64: string,
    rawString: string
  ): Promise<boolean> {
    try {
      if (!publicKeyPem || !signatureBase64) return false;
      const publicKey = await this.importPublicKey(publicKeyPem);
      const signatureBuffer = this.base64ToArrayBuffer(signatureBase64.trim());
      const encodedData = new TextEncoder().encode(rawString);
      return await window.crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5" },
        publicKey,
        signatureBuffer,
        encodedData
      );
    } catch {
      return false;
    }
  }

  public static async verifyPayload(
    publicKeyPem: string,
    signatureBase64: string,
    data: Record<string, unknown> | string
  ): Promise<boolean> {
    const rawString = typeof data === "string" ? data : JSON.stringify(data);
    return this.verifyRawString(publicKeyPem, signatureBase64, rawString);
  }

  private static async importPrivateKey(privateKeyPem: string): Promise<CryptoKey> {
    const keyBuffer = this.pemToArrayBuffer(privateKeyPem);
    return window.crypto.subtle.importKey(
      "pkcs8",
      keyBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  private static async importPublicKey(publicKeyPem: string): Promise<CryptoKey> {
    const keyBuffer = this.pemToArrayBuffer(publicKeyPem);
    return window.crypto.subtle.importKey(
      "spki",
      keyBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }

  private static pemToArrayBuffer(pem: string): ArrayBuffer {
    const base64Body = pem
      .replace(/-----BEGIN [A-Z0-9 ]+-----/g, "")
      .replace(/-----END [A-Z0-9 ]+-----/g, "")
      .replace(/\s+/g, "");
    return this.base64ToArrayBuffer(base64Body);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static toPem(buffer: ArrayBuffer, type: string): string {
    const base64 = this.arrayBufferToBase64(buffer);
    const formatted = base64.match(/.{1,64}/g)?.join("\n") || base64;
    return `-----BEGIN ${type}-----\n${formatted}\n-----END ${type}-----`;
  }
}

