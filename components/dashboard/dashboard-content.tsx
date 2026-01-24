"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { BankSelector } from "./bank-selector";
import { AccountTabs } from "./account-tabs";
import { TransactionsList } from "./transactions-list";
import { DashboardHeader } from "./dashboard-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useBankConnection } from "@/hooks/use-bank-connection";
import { useBankConnections } from "@/hooks/use-bank-connections";
import { Bank } from "@phosphor-icons/react";
import { formatCurrency } from "@/lib/utils";

export function DashboardContent() {
  const router = useRouter();
  const { banks, isLoading } = useBankConnections();
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  // Auto-select first bank when banks load
  useEffect(() => {
    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

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

  const handleBankSelect = (bankId: string | null) => {
    setSelectedBankId(bankId);
    setSelectedAccountId(null); // Reset account selection when bank changes
  };

  const handleAccountSelect = (accountId: string | null) => {
    setSelectedAccountId(accountId);
  };

  const handleViewAccountDetails = (accountId: string) => {
    router.push(`/dashboard/accounts/${accountId}`);
  };


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <DashboardHeader title="Accounts" />

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
              onClick: connectBank,
              loading: isConnecting,
            }}
          />
        </div>
      )}

      {/* Loading or content */}
      {(isLoading || banks.length > 0) && (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
          {/* Loading skeleton */}
          {isLoading && (
            <>
              {/* Total Balance skeleton */}
              <div className="space-y-1">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-10 w-40 bg-muted rounded animate-pulse" />
              </div>

              {/* Account Tabs skeleton */}
              <Separator />
              <section>
                <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
                <div className="flex gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 w-28 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              </section>

              {/* Spending Summary skeleton */}
              <Separator />
              <section>
                <div className="h-4 w-36 bg-muted rounded animate-pulse mb-3" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-lg border space-y-2">
                      <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                      <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Transactions skeleton */}
              <Separator />
              <TransactionsList accountId={null} />
            </>
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
                      onViewDetails={handleViewAccountDetails}
                    />
                  </section>
                </>
              )}

              <Separator />

              {/* Recent Transactions */}
              <TransactionsList accountId={selectedAccount?.id ?? null} />
            </>
          )}

        </div>
      </div>
      )}

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
