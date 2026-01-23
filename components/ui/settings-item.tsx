"use client";

import { ReactNode, ComponentType } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CaretRight } from "@phosphor-icons/react";

interface SettingsItemBaseProps {
  /** Icon component to display */
  icon: ComponentType<{ size?: number; className?: string }> | ReactNode;
  /** Title of the setting */
  title: string;
  /** Description or subtitle */
  description?: string;
  /** Badge to display (e.g., "Pro", "New") */
  badge?: string | null;
  /** Show loading state for badge */
  badgeLoading?: boolean;
  /** Whether to show separator above this item */
  showSeparator?: boolean;
  /** Disable the item */
  disabled?: boolean;
  /** Additional classes for the container */
  className?: string;
}

interface SettingsItemToggleProps extends SettingsItemBaseProps {
  /** Action type - toggle shows a switch */
  action: "toggle";
  /** Current value for toggle */
  value: boolean;
  /** Called when toggle changes */
  onChange: (value: boolean) => void;
  /** Never used for toggle */
  href?: never;
  onClick?: never;
}

interface SettingsItemLinkProps extends SettingsItemBaseProps {
  /** Action type - link navigates to a page */
  action: "link";
  /** URL to navigate to */
  href: string;
  /** Never used for link */
  value?: never;
  onChange?: never;
  onClick?: never;
}

interface SettingsItemButtonProps extends SettingsItemBaseProps {
  /** Action type - button triggers an action */
  action: "button";
  /** Called when button is clicked */
  onClick: () => void;
  /** Never used for button */
  href?: never;
  value?: never;
  onChange?: never;
}

export type SettingsItemProps =
  | SettingsItemToggleProps
  | SettingsItemLinkProps
  | SettingsItemButtonProps;

/**
 * Reusable settings item component for consistent settings UI
 *
 * @example
 * ```tsx
 * // Toggle item
 * <SettingsItem
 *   icon={Bell}
 *   title="Notifications"
 *   description="Receive push notifications"
 *   action="toggle"
 *   value={isEnabled}
 *   onChange={setIsEnabled}
 * />
 *
 * // Link item
 * <SettingsItem
 *   icon={User}
 *   title="Profile"
 *   description="Manage your account"
 *   action="link"
 *   href="/settings/profile"
 *   badge="Pro"
 * />
 *
 * // Button item
 * <SettingsItem
 *   icon={SignOut}
 *   title="Log Out"
 *   description="Sign out of your account"
 *   action="button"
 *   onClick={handleLogout}
 * />
 * ```
 */
export function SettingsItem(props: SettingsItemProps) {
  const {
    icon: IconComponent,
    title,
    description,
    badge,
    badgeLoading,
    showSeparator,
    disabled,
    className,
    action,
  } = props;

  const router = useRouter();

  // Render the icon
  const renderIcon = () => {
    if (typeof IconComponent === "function") {
      const Icon = IconComponent as ComponentType<{ size?: number; className?: string }>;
      return <Icon size={20} className="text-muted-foreground" />;
    }
    return IconComponent;
  };

  // Handle click for toggle (on the entire row)
  const handleToggleClick = () => {
    if (action === "toggle" && !disabled) {
      props.onChange(!props.value);
    }
  };

  // Handle click for link/button
  const handleClick = () => {
    if (disabled) return;

    if (action === "link" && props.href) {
      router.push(props.href);
    } else if (action === "button" && props.onClick) {
      props.onClick();
    }
  };

  // Common content
  const content = (
    <>
      <div className="flex items-center gap-3">
        {renderIcon()}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{title}</p>
            {badgeLoading ? (
              <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded animate-pulse w-10 h-4" />
            ) : badge ? (
              <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {badge}
              </span>
            ) : null}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action === "toggle" ? (
        <Switch
          checked={props.value}
          onCheckedChange={props.onChange}
          disabled={disabled}
        />
      ) : (
        <CaretRight size={16} className="text-muted-foreground" />
      )}
    </>
  );

  // For toggle items, use div with click handler
  if (action === "toggle") {
    return (
      <>
        {showSeparator && <Separator />}
        <div
          className={cn(
            "w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          onClick={handleToggleClick}
        >
          {content}
        </div>
      </>
    );
  }

  // For link/button items, use button
  return (
    <>
      {showSeparator && <Separator />}
      <button
        className={cn(
          "w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        disabled={disabled}
      >
        {content}
      </button>
    </>
  );
}

/**
 * Loading skeleton for settings items
 */
export function SettingsItemSkeleton({ showSeparator = false }: { showSeparator?: boolean }) {
  return (
    <>
      {showSeparator && <Separator />}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-5 rounded" />
          <div>
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="size-4" />
      </div>
    </>
  );
}

/**
 * Group wrapper for settings items
 */
export function SettingsGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("divide-y", className)}>{children}</div>;
}
