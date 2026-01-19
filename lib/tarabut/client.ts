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
 * - API: https://api.sau.sandbox.tarabutgateway.io
 */

// Tarabut centralized endpoints
const TARABUT_SANDBOX_TOKEN_URL = "https://oauth.tarabutgateway.io/sandbox/token";
const TARABUT_SANDBOX_API_URL = "https://api.sau.sandbox.tarabutgateway.io";

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
    id: string;
    name: string;
  };
  merchantDetails?: {
    name: string;
    category?: string;
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
   * Get account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<BalancesResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/balance`;

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
   * Refresh account balance (real-time from bank)
   */
  async refreshAccountBalance(accessToken: string, accountId: string): Promise<BalancesResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/balance/refresh`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh balance: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh account transactions (latest from bank)
   */
  async refreshTransactions(accessToken: string, accountId: string): Promise<TransactionsResponse> {
    const endpoint = `${TARABUT_SANDBOX_API_URL}/accountInformation/v2/accounts/${accountId}/transactions/refresh`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh transactions: ${response.status} - ${error}`);
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
