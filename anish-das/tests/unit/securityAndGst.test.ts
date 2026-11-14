import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { hashWorkspacePassword, verifyWorkspacePassword } from "../../src/utils/cryptoPassword.js";
import { DEFAULT_HOME_STATE, normalizeHomeState } from "../../src/utils/indianGstStates.js";
import { getErrorMessage } from "../../src/utils/errors.js";
import { getOptionalEnv, getRequiredEnv, getSanitizedHost } from "../../src/config/env.js";

describe("Security Password Hashing, GST Jurisdictions & Config Utilities", () => {
  const savedTestKey = process.env.LEDGERGUARD_TEST_REQUIRED_VAR;

  afterEach(() => {
    if (savedTestKey === undefined) {
      delete process.env.LEDGERGUARD_TEST_REQUIRED_VAR;
    } else {
      process.env.LEDGERGUARD_TEST_REQUIRED_VAR = savedTestKey;
    }
    jest.restoreAllMocks();
  });

  describe("PBKDF2 Workspace Password Utilities", () => {
    it("hashes passcodes with unique random salts and verifies accurately", () => {
      const hashA = hashWorkspacePassword("TopSecret@2026");
      const hashB = hashWorkspacePassword("TopSecret@2026");

      expect(hashA).toContain(":");
      expect(hashA).not.toBe(hashB);
      expect(verifyWorkspacePassword("TopSecret@2026", hashA)).toBe(true);
      expect(verifyWorkspacePassword("  TopSecret@2026  ", hashA)).toBe(true);
      expect(verifyWorkspacePassword("WrongPassword", hashA)).toBe(false);
    });

    it("rejects blank, missing, or malformed stored hashes cleanly", () => {
      expect(hashWorkspacePassword("   ")).toBe("");
      expect(verifyWorkspacePassword("anything", null)).toBe(false);
      expect(verifyWorkspacePassword("anything", undefined)).toBe(false);
      expect(verifyWorkspacePassword("anything", "malformed_no_colon")).toBe(false);
    });
  });

  describe("Indian GST State Normalization", () => {
    it("defaults missing or unrecognized values to West Bengal (19)", () => {
      expect(normalizeHomeState(undefined)).toBe(DEFAULT_HOME_STATE);
      expect(normalizeHomeState(null)).toBe(DEFAULT_HOME_STATE);
      expect(normalizeHomeState("   ")).toBe(DEFAULT_HOME_STATE);
      expect(normalizeHomeState("Mars Colony (99)")).toBe(DEFAULT_HOME_STATE);
    });

    it("resolves exact labels, GST codes, and state name prefixes case-insensitively", () => {
      expect(normalizeHomeState("maharashtra (27)")).toBe("Maharashtra (27)");
      expect(normalizeHomeState("27")).toBe("Maharashtra (27)");
      expect(normalizeHomeState("Karnataka")).toBe("Karnataka (29)");
      expect(normalizeHomeState("07")).toBe("Delhi (07)");
    });
  });

  describe("Environment Helpers & Error Narrowing", () => {
    it("throws clear error on missing required env vars and returns trimmed value when present", () => {
      delete process.env.LEDGERGUARD_TEST_REQUIRED_VAR;
      expect(() => getRequiredEnv("LEDGERGUARD_TEST_REQUIRED_VAR")).toThrow(/MISSING_ENV_VAR/);

      process.env.LEDGERGUARD_TEST_REQUIRED_VAR = "  configured-secret-value  ";
      expect(getRequiredEnv("LEDGERGUARD_TEST_REQUIRED_VAR")).toBe("configured-secret-value");
      expect(getOptionalEnv("NON_EXISTENT_OPTIONAL_KEY", "fallback-ok")).toBe("fallback-ok");
    });

    it("sanitizes URIs to hostname only without leaking credentials or query parameters", () => {
      const secretUri = "mongodb+srv://dbuser:SuperSecretPwd@cluster0.demo.mongodb.net/?retryWrites=true";
      expect(getSanitizedHost(secretUri)).toBe("cluster0.demo.mongodb.net");
      expect(getSanitizedHost("not a url", "safe-fallback")).toBe("safe-fallback");
      expect(getSanitizedHost(undefined, "default-host")).toBe("default-host");
    });

    it("extracts readable messages from Error, strings, and unknown thrown values", () => {
      expect(getErrorMessage(new Error("Boom"))).toBe("Boom");
      expect(getErrorMessage("Plain string error")).toBe("Plain string error");
      expect(getErrorMessage({ code: 500 }, "Fallback message")).toBe("Fallback message");
    });
  });
});

