"use client";

import { useState, useEffect } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { BankSelector } from "./bank-selector";
import { AccountTabs } from "./account-tabs";
import { TransactionsList } from "./transactions-list";
import { SpendingSummary } from "./spending-summary";
import { MobileNavButton } from "@/components/mobile-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { Bank } from "@phosphor-icons/react";

interface BankConnection {
  id: string;
  bank_id: string;
  bank_name: string;
  status: string;
  accounts: Account[];
}

interface Account {
  id: string;
  account_id: string;
  account_type: string;
  account_number: string;
  currency: string;
  balance: number;
  available_balance: number;
}

export function DashboardContent() {
  const [banks, setBanks] = useState<BankConnection[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/finance/banks");
        if (response.ok) {
          const data = await response.json();
          setBanks(data.banks ?? []);

          // Auto-select first bank if available
          if (data.banks && data.banks.length > 0) {
            setSelectedBankId(data.banks[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch banks:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get currently selected bank
  const selectedBank = banks.find((b) => b.id === selectedBankId);

  // Get accounts for selected bank
  const accounts = selectedBank?.accounts ?? [];

  // Get selected account (or first account if none selected)
  const selectedAccount = selectedAccountId
    ? accounts.find((a) => a.id === selectedAccountId)
    : accounts[0];

  // Calculate total balance across all banks
  const totalBalance = banks.reduce(
    (sum, bank) => sum + bank.accounts.reduce((acc, a) => acc + a.balance, 0),
    0
  );

  const currency = accounts[0]?.currency ?? "BHD";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleBankSelect = (bankId: string | null) => {
    setSelectedBankId(bankId);
    setSelectedAccountId(null); // Reset account selection when bank changes
  };

  const handleAccountSelect = (accountId: string | null) => {
    setSelectedAccountId(accountId);
  };

  const handleConnectBank = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/tarabut/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to connect");
      }

      const { authorizationUrl } = await response.json();
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error("Failed to initiate connection:", error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="!self-center h-4" />
          <h1 className="font-semibold">Dashboard</h1>
        </div>
        <MobileNavButton />
      </header>

      {/* Main content */}
      {/* Empty State - No banks connected */}
      {!isLoading && banks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Bank size={28} className="text-muted-foreground" />}
            title="Welcome to Finauraa"
            description="Connect your bank accounts to start tracking your finances, view balances, and get AI-powered insights."
            action={{
              label: isConnecting ? "Connecting..." : "Connect Your First Bank",
              onClick: handleConnectBank,
              loading: isConnecting,
            }}
          />
        </div>
      )}

      {/* Loading or content */}
      {(isLoading || banks.length > 0) && (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Loading skeleton for total balance */}
          {isLoading && (
            <div className="space-y-1">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-40 bg-muted rounded animate-pulse" />
            </div>
          )}

          {/* Dashboard content - Only show when banks are connected */}
          {!isLoading && banks.length > 0 && (
            <>
              {/* Total Balance */}
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(totalBalance)}
                </p>
              </div>

              {/* Bank Selector - Horizontal Cards */}
              <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">Banks</h2>
                <BankSelector
                  banks={banks}
                  selectedBankId={selectedBankId}
                  onBankSelect={handleBankSelect}
                  isLoading={isLoading}
                />
              </section>

              {/* Account Tabs - Only show if a bank is selected */}
              {selectedBank && accounts.length > 0 && (
                <>
                  <Separator />
                  <section>
                    <h2 className="text-sm font-medium text-muted-foreground mb-3">
                      {selectedBank.bank_name} Accounts
                    </h2>
                    <AccountTabs
                      accounts={accounts}
                      selectedAccountId={selectedAccountId ?? accounts[0]?.id}
                      onAccountSelect={handleAccountSelect}
                    />
                  </section>
                </>
              )}

              <Separator />

              {/* Spending Summary */}
              <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {selectedAccount ? "Account Spending" : "Spending This Month"}
                </h2>
                <SpendingSummary accountId={selectedAccount?.id ?? null} />
              </section>

              <Separator />

              {/* Recent Transactions */}
              <section>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {selectedAccount ? "Account Transactions" : "Recent Transactions"}
                </h2>
                <TransactionsList accountId={selectedAccount?.id ?? null} />
              </section>
            </>
          )}

          {/* Loading skeleton for bank selector */}
          {isLoading && (
            <section>
              <div className="h-4 w-12 bg-muted rounded animate-pulse mb-3" />
              <BankSelector
                banks={[]}
                selectedBankId={null}
                onBankSelect={() => {}}
                isLoading={true}
              />
            </section>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
