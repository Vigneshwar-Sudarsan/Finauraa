"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { BankSelector } from "@/components/dashboard/bank-selector";
import { BankConsentDialog } from "@/components/dashboard/bank-consent-dialog";
import {
  CaretLeft,
  Bank,
  CreditCard,
  Wallet,
  CaretRight,
  ArrowsClockwise,
  SpinnerGap,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useBankConnections } from "@/hooks/use-bank-connections";

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

export default function ConnectedBanksPage() {
  const router = useRouter();
  const { banks, isLoading, mutate } = useBankConnections();
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deletingBankId, setDeletingBankId] = useState<string | null>(null);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Auto-select first bank when banks data changes
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

  // Open consent dialog before connecting
  const handleConnectBank = () => {
    setShowConsentDialog(true);
  };

  // Actually perform the connection after consent is given
  const handleConfirmConnect = async () => {
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
      setShowConsentDialog(false);
    }
  };

  const handleDisconnectBank = async (bankId: string, bankName: string) => {
    if (!confirm(`Are you sure you want to disconnect ${bankName}? All accounts and transactions will be deleted.`)) {
      return;
    }

    setDeletingBankId(bankId);
    try {
      const response = await fetch(`/api/finance/connections/${bankId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Reset selection if the deleted bank was selected
        if (selectedBankId === bankId) {
          const remainingBanks = banks.filter(b => b.id !== bankId);
          setSelectedBankId(remainingBanks.length > 0 ? remainingBanks[0].id : null);
        }
        // Revalidate the cache
        await mutate();
      }
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setDeletingBankId(null);
    }
  };

  // Get accounts - filter by selected bank if one is selected
  const allAccounts = banks.flatMap((bank) =>
    bank.accounts.map((acc) => ({ ...acc, bankName: bank.bank_name, bankId: bank.id }))
  );

  const displayedAccounts = selectedBankId
    ? allAccounts.filter((acc) => acc.bankId === selectedBankId)
    : allAccounts;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <CaretLeft size={16} />
            Back
          </Button>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Title skeleton */}
            <div className="space-y-1">
              <div className="h-6 w-36 bg-muted rounded animate-pulse" />
              <div className="h-4 w-56 bg-muted rounded animate-pulse" />
            </div>
            {/* Bank cards skeleton */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[140px] h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
            {/* Accounts list skeleton */}
            <div className="rounded-xl border p-4 space-y-3">
              <div className="h-5 w-24 bg-muted rounded animate-pulse" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="size-10 bg-muted rounded-xl animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-36 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="p-4 border-b sticky top-0 bg-background z-10 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2"
        >
          <CaretLeft size={16} />
          Back to Settings
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <SpinnerGap size={20} className="animate-spin" />
            ) : (
              <ArrowsClockwise size={20} />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnectBank}
            disabled={isConnecting}
            className="gap-2"
          >
            {isConnecting ? (
              <SpinnerGap size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Add Bank
          </Button>
        </div>
      </div>

      {/* Empty state - No banks connected */}
      {banks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<Bank size={28} className="text-muted-foreground" />}
            title="No banks connected"
            description="Connect your bank accounts to view balances, transactions, and get insights on your spending."
            action={{
              label: isConnecting ? "Connecting..." : "Connect Bank",
              onClick: handleConnectBank,
              loading: isConnecting,
            }}
          />
        </div>
      )}

      {/* Main content */}
      {banks.length > 0 && (
        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto pb-24">
            {/* Page Title */}
            <div>
              <h1 className="text-xl font-semibold">Connected Banks</h1>
              <p className="text-sm text-muted-foreground">
                Manage your bank connections and accounts
              </p>
            </div>

            {/* Banks - isLoading=false since page handles loading state */}
            <BankSelector
              banks={banks}
              selectedBankId={selectedBankId}
              onBankSelect={setSelectedBankId}
              isLoading={false}
            />

            {/* Accounts List */}
            {displayedAccounts.length > 0 && (
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
            {displayedAccounts.length === 0 && (
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

            {/* Danger Zone */}
            <Card className="border-red-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Disconnecting a bank will remove all its accounts and transaction history.
                </p>
                <div className="space-y-2">
                  {banks.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-red-500/20 bg-red-500/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <Bank size={16} className="text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{bank.bank_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {bank.accounts.length} account{bank.accounts.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnectBank(bank.id, bank.bank_name)}
                        disabled={deletingBankId === bank.id}
                      >
                        {deletingBankId === bank.id ? (
                          <SpinnerGap size={14} className="animate-spin mr-1" />
                        ) : (
                          <Trash size={14} className="mr-1" />
                        )}
                        Disconnect
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Consent Dialog */}
      <BankConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConfirm={handleConfirmConnect}
        isConnecting={isConnecting}
      />
    </div>
  );
}
