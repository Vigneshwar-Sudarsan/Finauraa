"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

// Default fetcher for SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.");
    throw error;
  }

  return res.json();
};

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false, // Don't refetch on window focus
        revalidateIfStale: true, // Revalidate if data is stale
        dedupingInterval: 5000, // Dedupe requests within 5 seconds
        errorRetryCount: 2, // Retry failed requests twice
        keepPreviousData: true, // Keep showing previous data while fetching new
      }}
    >
      {children}
    </SWRConfig>
  );
}
