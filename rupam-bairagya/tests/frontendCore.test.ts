import { webcrypto } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import {
  DEFAULT_HOME_STATE,
  INDIAN_GST_JURISDICTIONS,
  computeGstSplit,
  getPlaceOfSupplyOptions,
  normalizeHomeState,
} from "../src/utils/gstStates.js";
import { RsaCryptoHelper } from "../src/crypto/rsaHelper.js";
import { getApiErrorCode, getApiErrorMessage, getApiErrorStatus } from "../src/utils/errors.js";

describe("LedgerGuard Frontend GST Engine, WebCrypto RSA Signing & Error Utilities", () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

  beforeAll(() => {
    Object.defineProperty(globalThis, "window", {
      value: { crypto: webcrypto },
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  });

  describe("Indian GST Jurisdictions & Tax Split Calculator", () => {
    it("contains all 36 Indian states and UTs sorted alphabetically with code lookup", () => {
      expect(INDIAN_GST_JURISDICTIONS).toHaveLength(36);
      expect(INDIAN_GST_JURISDICTIONS[0].name).toBe("Andaman & Nicobar Islands");
      expect(DEFAULT_HOME_STATE).toBe("West Bengal (19)");
      expect(normalizeHomeState("27")).toBe("Maharashtra (27)");
      expect(normalizeHomeState("unknown_state")).toBe("West Bengal (19)");
    });

    it("labels intra-state vs inter-state options accurately relative to seller workspace homeState", () => {
      const options = getPlaceOfSupplyOptions("Karnataka (29)");
      const ka = options.find((o) => o.value === "Karnataka (29)");
      const wb = options.find((o) => o.value === "West Bengal (19)");

      expect(ka?.badge).toBe("Intra");
      expect(ka?.subLabel).toContain("CGST+SGST");
      expect(wb?.badge).toBe("IGST");
      expect(wb?.subLabel).toContain("Inter-State");
    });

    it("computes CGST+SGST (9%+9%), IGST (18%), and GST-exempt splits with exact rounding", () => {
      const intra = computeGstSplit(1000, true, null, "West Bengal (19)", "West Bengal (19)");
      expect(intra).toEqual({
        mode: "INTRA_STATE",
        totalGstRupees: 180,
        cgstRupees: 90,
        sgstRupees: 90,
        igstRupees: 0,
      });

      const inter = computeGstSplit(1000, true, null, "West Bengal (19)", "Maharashtra (27)");
      expect(inter).toEqual({
        mode: "INTER_STATE",
        totalGstRupees: 180,
        cgstRupees: 0,
        sgstRupees: 0,
        igstRupees: 180,
      });

      const exempt = computeGstSplit(1000, false, "INTRA_STATE", "West Bengal (19)", "West Bengal (19)");
      expect(exempt).toEqual({
        mode: "EXEMPT",
        totalGstRupees: 0,
        cgstRupees: 0,
        sgstRupees: 0,
        igstRupees: 0,
      });

      // Explicit backend-persisted supplyType overrides state inference for historical invoices
      const forcedIntra = computeGstSplit(1001, true, "INTRA_STATE", "Karnataka (29)", "Delhi (07)");
      expect(forcedIntra.mode).toBe("INTRA_STATE");
      expect(forcedIntra.cgstRupees + forcedIntra.sgstRupees).toBeCloseTo(forcedIntra.totalGstRupees, 2);
    });
  });

  describe("In-Browser 2048-bit RSA-SHA256 RsaCryptoHelper", () => {
    it("generates SPKI/PKCS8 keypairs, signs payloads, and detects tampered payloads", async () => {
      const pair = await RsaCryptoHelper.generateKeyPair();
      expect(pair.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
      expect(pair.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
      expect(pair.keyFingerprint.length).toBeGreaterThan(20);

      const payload = { invoiceNumber: "INV-202601", amountCents: 450000, tenantId: "acme_corp" };
      const signature = await RsaCryptoHelper.signPayload(pair.privateKeyPem, payload);
      expect(signature.length).toBeGreaterThan(64);

      const isAuthentic = await RsaCryptoHelper.verifyPayload(pair.publicKeyPem, signature, payload);
      expect(isAuthentic).toBe(true);

      const isTamperedValid = await RsaCryptoHelper.verifyPayload(pair.publicKeyPem, signature, {
        ...payload,
        amountCents: 100,
      });
      expect(isTamperedValid).toBe(false);
    });
  });

  describe("API & Unknown Error Narrowing", () => {
    it("extracts HTTP status, backend error code, and friendly message without type assertions", () => {
      const axiosLikeError = {
        isAxiosError: true,
        message: "Request failed with status code 403",
        response: {
          status: 403,
          data: {
            error: "WORKSPACE_SUSPENDED",
            message: "Workspace is suspended by admin.",
          },
        },
      };

      expect(getApiErrorMessage(axiosLikeError)).toBe("Workspace is suspended by admin.");
      expect(getApiErrorStatus(axiosLikeError)).toBe(403);
      expect(getApiErrorCode(axiosLikeError)).toBe("WORKSPACE_SUSPENDED");

      expect(getApiErrorMessage(new Error("Network down"))).toBe("Network down");
      expect(getApiErrorMessage({ weird: true }, "Safe fallback")).toBe("Safe fallback");
      expect(getApiErrorStatus(new Error("not axios"))).toBeUndefined();
      expect(getApiErrorCode(new Error("not axios"))).toBeUndefined();
    });
  });
});

