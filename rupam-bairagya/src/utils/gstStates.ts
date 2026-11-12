import type { PremiumSelectOption } from "../components/PremiumSelect.js";

export interface IndianGstJurisdiction {
  code: string;
  name: string;
  type: "State" | "Union Territory";
  keywords: string;
}

export const DEFAULT_HOME_STATE = "West Bengal (19)";

const RAW_INDIAN_GST_JURISDICTIONS: IndianGstJurisdiction[] = [
  { code: "35", name: "Andaman & Nicobar Islands", type: "Union Territory", keywords: "an port blair island ut" },
  { code: "37", name: "Andhra Pradesh", type: "State", keywords: "ap vijayawada visakhapatnam amaravati tirupati" },
  { code: "12", name: "Arunachal Pradesh", type: "State", keywords: "ar itanagar" },
  { code: "18", name: "Assam", type: "State", keywords: "as guwahati dispur" },
  { code: "10", name: "Bihar", type: "State", keywords: "br patna gaya" },
  { code: "04", name: "Chandigarh", type: "Union Territory", keywords: "ch ut" },
  { code: "22", name: "Chhattisgarh", type: "State", keywords: "cg raipur bilaspur" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu", type: "Union Territory", keywords: "dn dd dnhdd silvassa daman diu ut" },
  { code: "07", name: "Delhi", type: "Union Territory", keywords: "dl ncr new delhi ut" },
  { code: "30", name: "Goa", type: "State", keywords: "ga panaji margao" },
  { code: "24", name: "Gujarat", type: "State", keywords: "gj ahmedabad surat vadodara rajkot" },
  { code: "06", name: "Haryana", type: "State", keywords: "hr gurugram gurgaon faridabad" },
  { code: "02", name: "Himachal Pradesh", type: "State", keywords: "hp shimla dharamshala" },
  { code: "01", name: "Jammu & Kashmir", type: "Union Territory", keywords: "jk srinagar jammu ut" },
  { code: "20", name: "Jharkhand", type: "State", keywords: "jh ranchi jamshedpur dhanbad" },
  { code: "29", name: "Karnataka", type: "State", keywords: "ka bangalore bengaluru mysuru hubballi" },
  { code: "32", name: "Kerala", type: "State", keywords: "kl kochi thiruvananthapuram kozhikode" },
  { code: "38", name: "Ladakh", type: "Union Territory", keywords: "la leh kargil ut" },
  { code: "31", name: "Lakshadweep", type: "Union Territory", keywords: "ld kavaratti ut" },
  { code: "23", name: "Madhya Pradesh", type: "State", keywords: "mp indore bhopal jabalpur gwalior" },
  { code: "27", name: "Maharashtra", type: "State", keywords: "mh mumbai pune nagpur nashik thane" },
  { code: "14", name: "Manipur", type: "State", keywords: "mn imphal" },
  { code: "17", name: "Meghalaya", type: "State", keywords: "ml shillong" },
  { code: "15", name: "Mizoram", type: "State", keywords: "mz aizawl" },
  { code: "13", name: "Nagaland", type: "State", keywords: "nl kohima dimapur" },
  { code: "21", name: "Odisha", type: "State", keywords: "od orissa bhubaneswar cuttack" },
  { code: "34", name: "Puducherry", type: "Union Territory", keywords: "py pondicherry ut" },
  { code: "03", name: "Punjab", type: "State", keywords: "pb ludhiana amritsar jalandhar mohali" },
  { code: "08", name: "Rajasthan", type: "State", keywords: "rj jaipur udaipur jodhpur kota" },
  { code: "11", name: "Sikkim", type: "State", keywords: "sk gangtok" },
  { code: "33", name: "Tamil Nadu", type: "State", keywords: "tn chennai coimbatore madurai" },
  { code: "36", name: "Telangana", type: "State", keywords: "ts hyderabad warangal" },
  { code: "16", name: "Tripura", type: "State", keywords: "tr agartala" },
  { code: "09", name: "Uttar Pradesh", type: "State", keywords: "up noida lucknow kanpur varanasi ghaziabad agra" },
  { code: "05", name: "Uttarakhand", type: "State", keywords: "uk uttaranchal dehradun haridwar" },
  { code: "19", name: "West Bengal", type: "State", keywords: "wb kolkata siliguri durgapur howrah bengal" },
];

export const INDIAN_GST_JURISDICTIONS: IndianGstJurisdiction[] = [...RAW_INDIAN_GST_JURISDICTIONS].sort(
  (a, b) => a.name.localeCompare(b.name, "en")
);

export const GSTIN_STATE_CODE_MAP: Record<string, string> = INDIAN_GST_JURISDICTIONS.reduce(
  (acc, item) => {
    acc[item.code] = `${item.name} (${item.code})`;
    return acc;
  },
  {
    "25": "Dadra & Nagar Haveli and Daman & Diu (26)",
    "28": "Andhra Pradesh (37)",
  } as Record<string, string>
);

const STATE_LOOKUP = new Map<string, string>(
  INDIAN_GST_JURISDICTIONS.map((item) => {
    const label = `${item.name} (${item.code})`;
    return [label.toLowerCase(), label];
  })
);

export function normalizeHomeState(value?: string | null): string {
  if (!value || typeof value !== "string") return DEFAULT_HOME_STATE;
  const clean = value.trim();
  const exact = STATE_LOOKUP.get(clean.toLowerCase());
  if (exact) return exact;

  const found = INDIAN_GST_JURISDICTIONS.find(
    (item) =>
      item.name.toLowerCase() === clean.toLowerCase() ||
      item.code === clean
  );
  return found ? `${found.name} (${found.code})` : DEFAULT_HOME_STATE;
}

export const WORKSPACE_HOME_STATE_OPTIONS: PremiumSelectOption[] = INDIAN_GST_JURISDICTIONS.map((item) => {
  const fullLabel = `${item.name} (${item.code})`;
  const isState = item.type === "State";
  return {
    value: fullLabel,
    label: fullLabel,
    subLabel: `GST Code ${item.code} • ${item.type}`,
    badge: isState ? "State" : "UT",
    badgeColor: isState
      ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
      : "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    searchKeywords: `${item.code} ${item.keywords} ${item.type.toLowerCase()}`,
  };
});

export function getPlaceOfSupplyOptions(homeState?: string | null): PremiumSelectOption[] {
  const resolvedHome = normalizeHomeState(homeState);
  return INDIAN_GST_JURISDICTIONS.map((item) => {
    const fullLabel = `${item.name} (${item.code})`;
    const isHome = fullLabel.toLowerCase() === resolvedHome.toLowerCase();
    return {
      value: fullLabel,
      label: fullLabel,
      subLabel: isHome
        ? "Home State • CGST+SGST"
        : `Inter-State • ${item.type}`,
      badge: isHome ? "Intra" : "IGST",
      badgeColor: isHome
        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      searchKeywords: `${item.code} ${item.keywords} ${isHome ? "cgst sgst intra" : "igst inter"}`,
    };
  });
}

export interface GstTaxSplit {
  mode: "EXEMPT" | "INTRA_STATE" | "INTER_STATE" | "FLAT_GST";
  totalGstRupees: number;
  cgstRupees: number;
  sgstRupees: number;
  igstRupees: number;
}

export function computeGstSplit(
  taxableBaseRupees: number,
  isGstApplicable: boolean,
  explicitSupplyType?: "INTRA_STATE" | "INTER_STATE" | null,
  sellerHomeState?: string | null,
  customerPlaceOfSupply?: string | null
): GstTaxSplit {
  if (!isGstApplicable) {
    return {
      mode: "EXEMPT",
      totalGstRupees: 0,
      cgstRupees: 0,
      sgstRupees: 0,
      igstRupees: 0,
    };
  }

  const totalGst = Number((taxableBaseRupees * 0.18).toFixed(2));
  const cgst = Number((totalGst / 2).toFixed(2));
  const sgst = Number((totalGst - cgst).toFixed(2));

  let mode: GstTaxSplit["mode"] = "FLAT_GST";
  if (explicitSupplyType === "INTRA_STATE" || explicitSupplyType === "INTER_STATE") {
    mode = explicitSupplyType;
  } else if (sellerHomeState && customerPlaceOfSupply && customerPlaceOfSupply.trim()) {
    mode =
      normalizeHomeState(sellerHomeState).toLowerCase() ===
      normalizeHomeState(customerPlaceOfSupply).toLowerCase()
        ? "INTRA_STATE"
        : "INTER_STATE";
  }

  return {
    mode,
    totalGstRupees: totalGst,
    cgstRupees: mode === "INTRA_STATE" ? cgst : 0,
    sgstRupees: mode === "INTRA_STATE" ? sgst : 0,
    igstRupees: mode === "INTER_STATE" ? totalGst : 0,
  };
}

