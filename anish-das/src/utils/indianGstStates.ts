export const DEFAULT_HOME_STATE = "West Bengal (19)";

export const INDIAN_GST_STATE_LABELS = [
  "Andaman & Nicobar Islands (35)",
  "Andhra Pradesh (37)",
  "Arunachal Pradesh (12)",
  "Assam (18)",
  "Bihar (10)",
  "Chandigarh (04)",
  "Chhattisgarh (22)",
  "Dadra & Nagar Haveli and Daman & Diu (26)",
  "Delhi (07)",
  "Goa (30)",
  "Gujarat (24)",
  "Haryana (06)",
  "Himachal Pradesh (02)",
  "Jammu & Kashmir (01)",
  "Jharkhand (20)",
  "Karnataka (29)",
  "Kerala (32)",
  "Ladakh (38)",
  "Lakshadweep (31)",
  "Madhya Pradesh (23)",
  "Maharashtra (27)",
  "Manipur (14)",
  "Meghalaya (17)",
  "Mizoram (15)",
  "Nagaland (13)",
  "Odisha (21)",
  "Puducherry (34)",
  "Punjab (03)",
  "Rajasthan (08)",
  "Sikkim (11)",
  "Tamil Nadu (33)",
  "Telangana (36)",
  "Tripura (16)",
  "Uttar Pradesh (09)",
  "Uttarakhand (05)",
  "West Bengal (19)",
] as const;

const STATE_LOOKUP = new Map<string, string>(
  INDIAN_GST_STATE_LABELS.map((label) => [label.toLowerCase(), label])
);

export function normalizeHomeState(value?: string | null): string {
  if (!value || typeof value !== "string") {
    return DEFAULT_HOME_STATE;
  }
  const clean = value.trim();
  if (!clean) {
    return DEFAULT_HOME_STATE;
  }
  const exact = STATE_LOOKUP.get(clean.toLowerCase());
  if (exact) return exact;

  // Match either GST 2-digit code or state name prefix
  const matched = INDIAN_GST_STATE_LABELS.find(
    (label) =>
      label.toLowerCase().startsWith(clean.toLowerCase()) ||
      label.endsWith(`(${clean})`)
  );
  return matched || DEFAULT_HOME_STATE;
}

