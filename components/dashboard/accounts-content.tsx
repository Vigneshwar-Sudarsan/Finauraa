"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { DashboardHeader } from "./dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import { BankSelector } from "./bank-selector";
import { EmptyState } from "@/components/ui/empty-state";
import { useBankConnection } from "@/hooks/use-bank-connection";
import { useBankConnections } from "@/hooks/use-bank-connections";
import {
  Bank,
  CreditCard,
  Wallet,
  CaretRight,
  ArrowsClockwise,
  SpinnerGap,
} from "@phosphor-icons/react";

function getAccountIcon(accountType: string) {
  const type = accountType.toLowerCase();
  if (type.includes("credit") || type.includes("card")) {
    return CreditCard;
  }
  if (type.includes("savings")) {
    return Wallet;
  }
  return Bank;
}

export function AccountsContent() {
  const router = useRouter();
  const { banks, isLoading, mutate } = useBankConnections();
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Bank connection with consent dialog
  const { connectBank, isConnecting, ConsentDialog } = useBankConnection();

  // Auto-select first bank when banks load
  useEffect(() => {
    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/finance/refresh", { method: "POST" });
      if (response.ok) {
        await mutate();
      }
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAccountClick = (accountId: string) => {
    router.push(`/dashboard/accounts/${accountId}`);
  };


  // Get accounts - filter by selected bank if one is selected
  const allAccounts = banks.flatMap((bank) =>
    bank.accounts.map((acc) => ({ ...acc, bankName: bank.bank_name, bankId: bank.id }))
  );

  const displayedAccounts = selectedBankId
    ? allAccounts.filter((acc) => acc.bankId === selectedBankId)
    : allAccounts;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <DashboardHeader
        title="Connected Banks"
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? (
              <SpinnerGap size={20} className="animate-spin" />
            ) : (
              <ArrowsClockwise size={20} />
            )}
          </Button>
        }
      />

      {/* Empty state - No banks connected */}
      {!isLoading && banks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Bank size={28} className="text-muted-foreground" />}
            title="No banks connected"
            description="Connect your bank accounts to view balances, transactions, and get insights on your spending."
            action={{
              label: isConnecting ? "Connecting..." : "Connect Bank",
              onClick: connectBank,
              loading: isConnecting,
            }}
          />
        </div>
      )}

      {/* Main content */}
      {(isLoading || banks.length > 0) && (
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
          {/* Banks */}
          <BankSelector
            banks={banks}
            selectedBankId={selectedBankId}
            onBankSelect={setSelectedBankId}
            isLoading={isLoading}
          />

          {/* Accounts List Skeleton */}
          {isLoading && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Accounts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ItemGroup>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      {i > 1 && <ItemSeparator />}
                      <Item variant="default" size="sm">
                        <ItemMedia variant="icon">
                          <div className="size-10 rounded-xl bg-muted animate-pulse" />
                        </ItemMedia>
                        <ItemContent>
                          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-32 bg-muted rounded animate-pulse mt-1" />
                        </ItemContent>
                        <ItemActions>
                          <div className="flex items-center gap-2">
                            <div className="text-right space-y-1">
                              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                              <div className="h-3 w-16 bg-muted rounded animate-pulse ml-auto" />
                            </div>
                            <div className="size-4 bg-muted rounded animate-pulse" />
                          </div>
                        </ItemActions>
                      </Item>
                    </div>
                  ))}
                </ItemGroup>
              </CardContent>
            </Card>
          )}

          {/* Accounts List */}
          {!isLoading && displayedAccounts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Accounts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ItemGroup>
                  {displayedAccounts.map((account, index) => {
                    const Icon = getAccountIcon(account.account_type);

                    return (
                      <div key={account.id}>
                        {index > 0 && <ItemSeparator />}
                        <Item
                          variant="default"
                          size="sm"
                          asChild
                          className="cursor-pointer hover:bg-muted/50"
                        >
                          <button
                            onClick={() => handleAccountClick(account.id)}
                          >
                            <ItemMedia variant="icon">
                              <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
                                <Icon size={20} className="text-muted-foreground" />
                              </div>
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>{account.account_type}</ItemTitle>
                              <ItemDescription>
                                {account.bankName} · ****{account.account_number.slice(-4)}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <p className="font-semibold tabular-nums">
                                    {formatCurrency(account.balance, account.currency)}
                                  </p>
                                  {account.available_balance !== account.balance && (
                                    <p className="text-xs text-muted-foreground">
                                      Avail: {formatCurrency(account.available_balance, account.currency)}
                                    </p>
                                  )}
                                </div>
                                <CaretRight size={16} className="text-muted-foreground" />
                              </div>
                            </ItemActions>
                          </button>
                        </Item>
                      </div>
                    );
                  })}
                </ItemGroup>
              </CardContent>
            </Card>
          )}

          {/* Empty state - No accounts for selected bank */}
          {!isLoading && displayedAccounts.length === 0 && (
            <EmptyState
              icon={<Wallet size={28} className="text-muted-foreground" />}
              title="No accounts found"
              description="This bank doesn't have any accounts yet. Try refreshing or selecting a different bank."
              action={{
                label: isRefreshing ? "Refreshing..." : "Refresh",
                onClick: handleRefresh,
                loading: isRefreshing,
                variant: "outline",
              }}
            />
          )}

          {/* Refresh hint */}
          {!isLoading && displayedAccounts.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Tap the refresh button to sync latest data from your banks
            </p>
          )}
        </div>
      </div>
      )}

      {/* Bank Consent Dialog */}
      <ConsentDialog />
    </div>
  );
}
