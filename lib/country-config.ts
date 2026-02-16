/**
 * Country-specific configuration for multi-region support.
 * Used to display the correct regulatory framework, currency, and legal text
 * based on the user's selected country (BH or SA).
 */

export type CountryCode = "BH" | "SA";

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: string;
  currencyName: string;
  currencyDecimals: number;
  locale: string;
  /** Regulatory body (e.g., CBB for Bahrain, SAMA for Saudi Arabia) */
  regulator: string;
  regulatorFullName: string;
  /** Data protection law */
  dataProtectionLaw: string;
  dataProtectionLawFull: string;
  /** Open banking framework */
  openBankingFramework: string;
  openBankingFrameworkFull: string;
  /** Compliance footer text */
  complianceNotice: string;
  /** Consent dialog compliance text */
  consentComplianceText: string;
  /** Data rights description */
  dataRightsText: string;
  /** Audit retention requirement */
  auditRetentionText: string;
  /** Data export law reference */
  dataExportLawText: string;
}

const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  BH: {
    code: "BH",
    name: "Bahrain",
    currency: "BHD",
    currencyName: "Bahraini Dinar",
    currencyDecimals: 3,
    locale: "en-BH",
    regulator: "CBB",
    regulatorFullName: "Central Bank of Bahrain",
    dataProtectionLaw: "PDPL",
    dataProtectionLawFull: "Bahrain Personal Data Protection Law (PDPL)",
    openBankingFramework: "BOBF",
    openBankingFrameworkFull: "Open Banking Framework (BOBF)",
    complianceNotice: "Compliant with Bahrain PDPL regulations",
    consentComplianceText:
      "Protected under Bahrain Personal Data Protection Law (PDPL) and Open Banking Framework (BOBF)",
    dataRightsText:
      "Under Bahrain's Personal Data Protection Law, you have the right to access, export, and delete your personal data at any time.",
    auditRetentionText:
      "Some data may be retained for legal compliance (audit logs for 7 years per CBB regulations).",
    dataExportLawText:
      "This export includes all your personal data as required by PDPL (Personal Data Protection Law).",
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    currency: "SAR",
    currencyName: "Saudi Riyal",
    currencyDecimals: 2,
    locale: "en-SA",
    regulator: "SAMA",
    regulatorFullName: "Saudi Arabian Monetary Authority",
    dataProtectionLaw: "PDPL",
    dataProtectionLawFull: "Saudi Personal Data Protection Law (PDPL)",
    openBankingFramework: "SAMA Open Banking",
    openBankingFrameworkFull: "SAMA Open Banking Policy",
    complianceNotice: "Compliant with Saudi PDPL regulations",
    consentComplianceText:
      "Protected under Saudi Personal Data Protection Law (PDPL) and SAMA Open Banking Policy",
    dataRightsText:
      "Under Saudi Arabia's Personal Data Protection Law, you have the right to access, export, and delete your personal data at any time.",
    auditRetentionText:
      "Some data may be retained for legal compliance (audit logs for 7 years per SAMA regulations).",
    dataExportLawText:
      "This export includes all your personal data as required by PDPL (Personal Data Protection Law).",
  },
};

/**
 * Get the country configuration for a given country code.
 * Defaults to Bahrain (BH) if the code is invalid.
 */
export function getCountryConfig(countryCode?: string | null): CountryConfig {
  if (countryCode === "SA") return COUNTRY_CONFIGS.SA;
  return COUNTRY_CONFIGS.BH;
}

/**
 * Get the default currency for a country code.
 */
export function getDefaultCurrency(countryCode?: string | null): string {
  return getCountryConfig(countryCode).currency;
}
