"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CreditCard, Wallet, Bank, CaretRight } from "@phosphor-icons/react";

interface Account {
  id: string;
  account_id: string;
  account_type: string;
  account_number: string;
  currency: string;
  balance: number;
  available_balance: number;
}

interface AccountTabsProps {
  accounts: Account[];
  selectedAccountId: string;
  onAccountSelect: (accountId: string | null) => void;
}

type AccountCategory = "accounts" | "cards" | "finance";

const categoryConfig: Record<
  AccountCategory,
  { label: string; icon: typeof Wallet; keywords: string[] }
> = {
  accounts: {
    label: "Accounts",
    icon: Wallet,
    keywords: ["current", "savings", "checking", "deposit"],
  },
  cards: {
    label: "Cards",
    icon: CreditCard,
    keywords: ["card", "credit", "debit"],
  },
  finance: {
    label: "Finance",
    icon: Bank,
    keywords: ["loan", "finance", "mortgage", "investment"],
  },
};

function categorizeAccount(accountType: string): AccountCategory {
  const type = accountType.toLowerCase();

  for (const [category, config] of Object.entries(categoryConfig)) {
    if (config.keywords.some((keyword) => type.includes(keyword))) {
      return category as AccountCategory;
    }
  }

  return "accounts"; // Default to accounts
}

export function AccountTabs({
  accounts,
  selectedAccountId,
  onAccountSelect,
}: AccountTabsProps) {
  const [activeCategory, setActiveCategory] = useState<AccountCategory>("accounts");
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-BH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Group accounts by category
  const groupedAccounts = useMemo(() => {
    const groups: Record<AccountCategory, Account[]> = {
      accounts: [],
      cards: [],
      finance: [],
    };

    accounts.forEach((account) => {
      const category = categorizeAccount(account.account_type);
      groups[category].push(account);
    });

    return groups;
  }, [accounts]);

  // Get categories that have accounts
  const availableCategories = useMemo(() => {
    return (Object.keys(groupedAccounts) as AccountCategory[]).filter(
      (category) => groupedAccounts[category].length > 0
    );
  }, [groupedAccounts]);

  // Set initial active category to first available
  const effectiveCategory = availableCategories.includes(activeCategory)
    ? activeCategory
    : availableCategories[0] || "accounts";

  const filteredAccounts = groupedAccounts[effectiveCategory];

  const getAccountIcon = (accountType: string) => {
    const category = categorizeAccount(accountType);
    return categoryConfig[category].icon;
  };

  // Check if scroll indicator should be shown
  const checkScrollIndicator = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const hasMoreToScroll =
        container.scrollWidth > container.clientWidth &&
        container.scrollLeft + container.clientWidth < container.scrollWidth - 10;
      setShowScrollIndicator(hasMoreToScroll);
    }
  };

  useEffect(() => {
    checkScrollIndicator();
    window.addEventListener("resize", checkScrollIndicator);
    return () => window.removeEventListener("resize", checkScrollIndicator);
  }, [filteredAccounts]);

  const handleScroll = () => {
    checkScrollIndicator();
  };

  return (
    <div className="space-y-3">
      {/* Category Tabs */}
      {availableCategories.length > 1 && (
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          {availableCategories.map((category) => {
            const config = categoryConfig[category];
            const Icon = config.icon;
            const isActive = effectiveCategory === category;
            const count = groupedAccounts[category].length;

            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  "focus:outline-none",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={16} weight={isActive ? "fill" : "regular"} />
                <span>{config.label}</span>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-muted" : "bg-background/50"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Account Cards with Scroll Indicator */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-3 overflow-x-auto py-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {filteredAccounts.map((account) => {
            const isSelected = selectedAccountId === account.id;
            const Icon = getAccountIcon(account.account_type);

            return (
              <button
                key={account.id}
                onClick={() => onAccountSelect(account.id)}
                className={cn(
                  "flex-shrink-0 min-w-[160px] rounded-lg border p-3 flex flex-col gap-2 snap-start transition-all text-left",
                  "focus:outline-none",
                  isSelected
                    ? "border-foreground bg-foreground/5"
                    : "bg-card hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    size={16}
                    weight={isSelected ? "fill" : "regular"}
                    className={cn(
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isSelected ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {account.account_type}
                  </span>
                </div>

                <div>
                  <p className="font-semibold">
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {account.account_number}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Scroll Button */}
        {showScrollIndicator && (
          <button
            onClick={() => {
              const container = scrollContainerRef.current;
              if (container) {
                container.scrollBy({ left: 200, behavior: "smooth" });
              }
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center focus:outline-none"
          >
            <div className="w-8 h-full bg-gradient-to-l from-background to-transparent" />
            <div className="size-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center -ml-2 transition-colors">
              <CaretRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
