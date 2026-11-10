import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageEnvPath = path.resolve(__dirname, "../../.env");

dotenv.config();
if (fs.existsSync(packageEnvPath)) {
  dotenv.config({ path: packageEnvPath, override: false });
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`MISSING_ENV_VAR: '${name}' must be configured in anish-das/.env`);
  }
  return value;
}

export function getOptionalEnv(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export function getSanitizedHost(rawUrl: string | undefined, fallback = "not-configured"): string {
  if (!rawUrl) return fallback;
  try {
    return new URL(rawUrl).hostname || fallback;
  } catch {
    return fallback;
  }
}

