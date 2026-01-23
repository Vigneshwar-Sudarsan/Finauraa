"use client";

import * as React from "react";
import { SpinnerGap } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { type VariantProps } from "class-variance-authority";

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export interface LoadingButtonProps extends ButtonProps {
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Text to show while loading (defaults to children) */
  loadingText?: React.ReactNode;
  /** Position of the spinner relative to text */
  spinnerPosition?: "left" | "right";
  /** Custom spinner component */
  spinner?: React.ReactNode;
  /** Hide text while loading (show only spinner) */
  spinnerOnly?: boolean;
}

/**
 * Button component with built-in loading state
 *
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingButton loading={isSubmitting}>
 *   Submit
 * </LoadingButton>
 *
 * // With custom loading text
 * <LoadingButton loading={isSubmitting} loadingText="Saving...">
 *   Save
 * </LoadingButton>
 *
 * // Spinner on right
 * <LoadingButton loading={isSubmitting} spinnerPosition="right">
 *   Continue
 * </LoadingButton>
 *
 * // Spinner only (no text)
 * <LoadingButton loading={isSubmitting} spinnerOnly>
 *   Submit
 * </LoadingButton>
 * ```
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      className,
      children,
      disabled,
      loading = false,
      loadingText,
      spinnerPosition = "left",
      spinner,
      spinnerOnly = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const spinnerElement = spinner ?? (
      <SpinnerGap
        className={cn(
          "animate-spin",
          // Default size based on button size
          props.size === "sm" ? "size-3.5" : props.size === "lg" ? "size-5" : "size-4"
        )}
        weight="bold"
      />
    );

    const content = loading ? (
      <>
        {spinnerPosition === "left" && !spinnerOnly && spinnerElement}
        {spinnerOnly ? (
          spinnerElement
        ) : (
          <span className={spinnerPosition === "left" ? "ml-2" : "mr-2"}>
            {loadingText ?? children}
          </span>
        )}
        {spinnerPosition === "right" && !spinnerOnly && spinnerElement}
      </>
    ) : (
      children
    );

    return (
      <Button
        ref={ref}
        className={cn(
          loading && "cursor-not-allowed",
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {content}
      </Button>
    );
  }
);
LoadingButton.displayName = "LoadingButton";

export { LoadingButton };
