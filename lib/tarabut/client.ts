/**
 * Tarabut Gateway API Client
 * Handles authentication and API calls to Tarabut Open Banking platform
 *
 * Flow:
 * 1. Get access token from centralized auth endpoint
 * 2. Create Intent (returns connectUrl where user selects their bank)
 * 3. User completes consent via Tarabut Connect
 * 4. Fetch accounts and transactions
 *
 * Endpoints:
 * - Token: https://oauth.tarabutgateway.io/sandbox/token
 * - API: https://api.sandbox.tarabutgateway.io
 */

// Tarabut centralized endpoints
const TARABUT_SANDBOX_TOKEN_URL = "https://oauth.tarabutgateway.io/sandbox/token";
const TARABUT_SANDBOX_API_URL = "https://api.sandbox.tarabutgateway.io";

// Response types
export interface TarabutTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export interface CreateIntentRequest {
  user: {
    customerUserId: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  redirectUrl: string;
  providerType?: "Retail" | "Corporate";
  language?: "EN" | "AR";
  consent?: {
    providerId?: string;
    flowType?: "TARABUT_MANAGED" | "TPP_MANAGED";
    permissionsList?: string[];
  };
}

export interface CreateIntentResponse {
  connectUrl: string;
  intentId: string;
  expiry: string;
}

export interface TarabutAccountConsent {
  consentId: string;
  expiryDate?: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
}

export interface TarabutAccount {
  accountId: string;
  providerId: string;
  providerName?: string;
  accountType: string;
  accountSubType?: string;
  currency: string;
  identification?: string;
  name?: string;
  lastUpdatedDateTime?: string;
  consents?: TarabutAccountConsent[];
}

export interface TarabutBalance {
  accountId: string;
  type: string;
  amount: {
    value: number;
    currency: string;
  };
  lastBalancesUpdateDatetime?: string;
}

export interface TarabutTransaction {
  transactionId: string;
  accountId: string;
  providerId: string;
  transactionDescription?: string;
  transactionType?: string;
  category?: {
    group: string;  // "Expense" | "Income"
    name: string;   // "Eating Out", "Groceries", etc.
    icon?: string;  // URL to category icon SVG
  };
  merchant?: {
    name: string;
    logo?: string;  // URL to merchant logo SVG
  };
  creditDebitIndicator: "Credit" | "Debit";
  amount: {
    value: number;
    currency: string;
  };
  bookingDateTime: string;
}

export interface AccountsResponse {
  accounts: TarabutAccount[];
  meta?: {
    lastUpdatedDateTime?: string;
  };
}

export interface BalancesResponse {
  balances: TarabutBalance[];
  meta?: {
    lastBalancesUpdateDatetime?: string;
  };
}

export interface TransactionsResponse {
  transactions: TarabutTransaction[];
  meta?: {
    lastTransactionsUpdateDatetime?: string;
    totalPages?: number;
    currentPage?: number;
  };
}

export interface TarabutProvider {
  providerId: string;
  name: string;
  displayName: string;
  arabicDisplayName?: string;
  logoUrl: string;
  countryCode: string;
  aisStatus: "AVAILABLE" | "UNAVAILABLE";
  pisStatus: "AVAILABLE" | "UNAVAILABLE";
  supportedAISAuthType: string[];
  supportedPISAuthType: string[];
}

export interface ProvidersResponse {
  providers: TarabutProvider[];
}

export interface TarabutConsent {
  consentId: string;
  providerId: string;
  providerName?: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  createdAt: string;
  expiresAt?: string;
  permissions?: string[];
  accountIds?: string[]; // Account IDs covered by this consent
}

// ============ INSIGHTS API TYPES ============

export interface IncomeSummary {
  totalIncome: number;
  currency: string;
  period: {
    from: string;
    to: string;
  };
  sources: {
    type: string;
    amount: number;
    count: number;
  }[];
}

export interface IncomeDetails {
  transactions: {
    transactionId: string;
    accountId: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
    source: string;
    category?: string;
  }[];
}

export interface SalaryInfo {
  detected: boolean;
  employer?: string;
  amount?: number;
  currency?: string;
  frequency?: "MONTHLY" | "WEEKLY" | "BI_WEEKLY";
  nextExpectedDate?: string;
  lastPayDate?: string;
  confidence?: number;
}

export interface BalanceHistoryPoint {
  date: string;
  balance: number;
  currency: string;
}

export interface BalanceHistoryResponse {
  accountId: string;
  history: BalanceHistoryPoint[];
  period: {
    from: string;
    to: string;
  };
}

export interface BalanceHistoryV2Response {
  accounts: {
    accountId: string;
    history: BalanceHistoryPoint[];
  }[];
  aggregated?: BalanceHistoryPoint[];
  period: {
    from: string;
    to: string;
  };
}

export interface TransactionInsightsSummary {
  totalSpending: number;
  totalIncome: number;
  currency: string;
  period: {
    from: string;
    to: string;
  };
  categories: {
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  topMerchants?: {
    name: string;
    amount: number;
    count: number;
  }[];
}

export interface TransactionInsightsDetails {
  categories: {
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    transactions: {
      transactionId: string;
      accountId: string;
      amount: number;
      currency: string;
      date: string;
      description: string;
      merchantName?: string;
    }[];
  }[];
}

export interface IBANMatchRequest {
  iban: string;
  name: string;
}

export interface IBANMatchResponse {
  matched: boolean;
  confidence?: number;
  details?: {
    ibanValid: boolean;
    nameMatchScore: number;
  };
}

// Categorization API types
export interface CategorizeTransactionRequest {
  transactionId: string;
  description: string;
  amount: number;
  currency: string;
  creditDebitIndicator: "Credit" | "Debit";
  merchantName?: string;
  mcc?: string;
}

export interface CategorizedTransaction {
  transactionId: string;
  category: {
    id: string;
    name: string;
    parentCategory?: string;
  };
  confidence: number;
  merchantDetails?: {
    name: string;
    category?: string;
    logo?: string;
  };
}

export interface CategorizeBatchResponse {
  transactions: CategorizedTransaction[];
}

export interface CategoryListResponse {
  categories: {
    id: string;
    name: string;
    parentId?: string;
    icon?: string;
  }[];
}

export class TarabutClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.TARABUT_CLIENT_ID!;
    this.clientSecret = process.env.TARABUT_CLIENT_SECRET!;
    this.redirectUri = process.env.TARABUT_REDIRECT_URI!;

    if (!this.clientId || !this.clientSecret) {
      throw new Error("Tarabut credentials not configured");
    }
  }

  /**
   * Step 1: Get access token from Tarabut central auth
   */
  async getAccessToken(customerUserId?: string): Promise<TarabutTokenResponse> {
    const body: Record<string, string> = {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      grantType: "client_credentials",
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add customer identifier if provided (for user-specific tokens)
    if (customerUserId) {
      headers["X-TG-CustomerUserId"] = customerUserId;
    }

    const response = await fetch(TARABUT_SANDBOX_TOKEN_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Step 2: Create Intent for bank connection
   * Returns a connectUrl where user selects their bank and completes consent
   * The bank selection happens in Tarabut's hosted UI, not in our app
   */
  async createIntent(
    accessToken: string,
    user: { id: string; firstName: string; lastName: string; email?: string }
  ): Promise<CreateIntentResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v1/intent`;

    const intentRequest: CreateIntentRequest = {
      user: {
        customerUserId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      redirectUrl: this.redirectUri,
      providerType: "Retail",
      language: "EN",
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(intentRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create intent: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get list of connected accounts
   */
  async getAccounts(accessToken: string): Promise<AccountsResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get accounts: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get account balance (uses refresh endpoint to get latest balance from bank)
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<BalancesResponse> {
    // Use balances/refresh endpoint - this fetches latest balance from bank
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/balances/refresh`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get balance: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get account transactions (enriched with categories)
   */
  async getTransactions(
    accessToken: string,
    accountId: string,
    fromDate?: Date,
    toDate?: Date,
    page: number = 1
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
    });

    if (fromDate) {
      params.set("fromBookingDateTime", fromDate.toISOString());
    }
    if (toDate) {
      params.set("toBookingDateTime", toDate.toISOString());
    }

    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/transactions?${params.toString()}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get transactions: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get raw transactions (without enrichment)
   */
  async getRawTransactions(
    accessToken: string,
    accountId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams();

    if (fromDate) {
      params.set("fromBookingDateTime", fromDate.toISOString());
    }
    if (toDate) {
      params.set("toBookingDateTime", toDate.toISOString());
    }

    const queryString = params.toString();
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/rawtransactions${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get raw transactions: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh raw transactions (latest from bank)
   */
  async refreshRawTransactions(accessToken: string, accountId: string): Promise<TransactionsResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/rawtransactions/refresh`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh raw transactions: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get list of available bank providers (sandbox: Red Bank, Blue Bank)
   */
  async getProviders(accessToken: string): Promise<ProvidersResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/v1/providers`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get providers: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get account details
   */
  async getAccountDetails(accessToken: string, accountId: string): Promise<TarabutAccount> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get account details: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get all consents for a user
   */
  async getConsents(accessToken: string): Promise<{ consents: TarabutConsent[] }> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/consentInformation/v1/consents`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get consents: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get consent details
   */
  async getConsentDetails(accessToken: string, consentId: string): Promise<TarabutConsent> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/consentInformation/v1/consents/${consentId}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get consent details: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Revoke a consent (disconnect bank)
   */
  async revokeConsent(accessToken: string, consentId: string): Promise<void> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/consentInformation/v1/consents/${consentId}`;

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to revoke consent: ${response.status} - ${error}`);
    }
  }

  /**
   * Create consent dashboard URL (for user to manage their consents)
   */
  async createConsentDashboard(accessToken: string, redirectUrl: string): Promise<{ dashboardUrl: string }> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/consentInformation/v1/dashboard`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ redirectUrl }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create consent dashboard: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============ INSIGHTS API METHODS ============

  /**
   * Get Income Summary
   * Returns aggregated income data for the user
   */
  async getIncomeSummary(accessToken: string): Promise<IncomeSummary> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/income`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get income summary: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Income Details
   * Returns detailed income transactions
   */
  async getIncomeDetails(accessToken: string): Promise<IncomeDetails> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/income/details`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get income details: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Salary Check
   * Detects salary information from transactions
   */
  async getSalaryCheck(accessToken: string): Promise<SalaryInfo> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/income/salary`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get salary check: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Balance History for a specific account
   */
  async getBalanceHistory(accessToken: string, accountId: string): Promise<BalanceHistoryResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/balance-history/${accountId}`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get balance history: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Balance History V2 (multi-account)
   * Returns balance history for all accounts with optional aggregation
   */
  async getBalanceHistoryV2(accessToken: string): Promise<BalanceHistoryV2Response> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v2/balance-history`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get balance history v2: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Transaction Insights Summary
   * Returns categorized spending summary
   */
  async getTransactionInsightsSummary(accessToken: string): Promise<TransactionInsightsSummary> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/transaction-insights`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get transaction insights summary: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Transaction Insights Details
   * Returns detailed categorized transactions
   */
  async getTransactionInsightsDetails(accessToken: string): Promise<TransactionInsightsDetails> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/transaction-insights/details`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get transaction insights details: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get Salary Information
   * Alternative endpoint for salary data
   */
  async getSalary(accessToken: string): Promise<SalaryInfo> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/insights/v1/salary`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get salary: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * IBAN Match - Verify account ownership
   * Matches IBAN with account holder name
   */
  async matchIBAN(accessToken: string, request: IBANMatchRequest): Promise<IBANMatchResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountVerification/v1/matchIdentifier`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to match IBAN: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============ CATEGORIZATION API METHODS ============

  /**
   * Categorize a batch of transactions
   * Uses AI to categorize transactions based on description, amount, merchant
   */
  async categorizeTransactions(
    accessToken: string,
    transactions: CategorizeTransactionRequest[]
  ): Promise<CategorizeBatchResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/categorization/v1/categorize`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ transactions }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to categorize transactions: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get list of all available categories
   */
  async getCategories(accessToken: string): Promise<CategoryListResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/categorization/v1/categories`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get categories: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

/**
 * Create a new Tarabut client
 */
export function createTarabutClient(): TarabutClient {
  return new TarabutClient();
}
