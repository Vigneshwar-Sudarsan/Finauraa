"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { BankConsentDialog } from "@/components/dashboard/bank-consent-dialog";

interface UseBankConnectionOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface UseBankConnectionReturn {
  connectBank: () => void;
  isConnecting: boolean;
  ConsentDialog: React.FC;
}

/**
 * Hook for handling bank connection with BOBF/PDPL consent dialog
 * Use this hook anywhere you need to trigger bank connection
 *
 * Usage:
 * const { connectBank, isConnecting, ConsentDialog } = useBankConnection();
 *
 * // In your component:
 * <Button onClick={connectBank}>Connect Bank</Button>
 * <ConsentDialog />
 */
export function useBankConnection(options?: UseBankConnectionOptions): UseBankConnectionReturn {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Use refs to avoid stale closure issues and prevent unnecessary re-renders
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connectBank = useCallback(() => {
    setShowConsentDialog(true);
  }, []);

  const handleConfirmConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const response = await fetch("/api/tarabut/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to connect");
      }

      const { authorizationUrl } = await response.json();

      // Call onSuccess before redirect if provided
      optionsRef.current?.onSuccess?.();

      // Redirect to Tarabut Connect
      window.location.href = authorizationUrl;
    } catch (error) {
      setIsConnecting(false);
      setShowConsentDialog(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect";
      optionsRef.current?.onError?.(errorMessage);
    }
  }, []); // No dependencies - uses ref for options

  // Create a stable component that doesn't cause remounts
  const ConsentDialog = useCallback(
    function BankConsentDialogWrapper() {
      return (
        <BankConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onConfirm={handleConfirmConnect}
          isConnecting={isConnecting}
        />
      );
    },
    [showConsentDialog, isConnecting, handleConfirmConnect]
  );

  return {
    connectBank,
    isConnecting,
    ConsentDialog,
  };
}
