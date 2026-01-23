"use client";

import { useState, useCallback } from "react";

interface ApiCallOptions<TData, TResponse> {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** API endpoint URL */
  url: string;
  /** Transform request data before sending */
  transformRequest?: (data: TData) => unknown;
  /** Transform response data after receiving */
  transformResponse?: (response: unknown) => TResponse;
  /** Called on successful response */
  onSuccess?: (data: TResponse) => void;
  /** Called on error */
  onError?: (error: string) => void;
  /** Additional fetch options */
  fetchOptions?: Omit<RequestInit, "method" | "body">;
}

interface ApiCallState<TResponse> {
  /** Response data from successful call */
  data: TResponse | null;
  /** Error message if call failed */
  error: string | null;
  /** Whether a call is in progress */
  loading: boolean;
}

interface ApiCallReturn<TData, TResponse> extends ApiCallState<TResponse> {
  /** Execute the API call */
  execute: (data?: TData) => Promise<TResponse | null>;
  /** Reset state to initial values */
  reset: () => void;
  /** Clear just the error */
  clearError: () => void;
}

/**
 * Hook for making API calls with standardized error handling and loading states
 *
 * @example
 * ```tsx
 * // POST request
 * const { execute, loading, error, data } = useApiCall<CreateGoalData, Goal>({
 *   method: "POST",
 *   url: "/api/finance/savings-goals",
 *   onSuccess: (goal) => {
 *     toast.success("Goal created!");
 *     onClose();
 *   },
 * });
 *
 * await execute({ name: "Vacation", target_amount: 1000 });
 *
 * // GET request
 * const { execute: fetchData, loading, data } = useApiCall<void, UserData>({
 *   url: "/api/user/profile",
 *   onSuccess: (user) => setUser(user),
 * });
 *
 * useEffect(() => { fetchData(); }, []);
 * ```
 */
export function useApiCall<TData = void, TResponse = unknown>(
  options: ApiCallOptions<TData, TResponse>
): ApiCallReturn<TData, TResponse> {
  const {
    method = "GET",
    url,
    transformRequest,
    transformResponse,
    onSuccess,
    onError,
    fetchOptions,
  } = options;

  const [state, setState] = useState<ApiCallState<TResponse>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(
    async (data?: TData): Promise<TResponse | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const requestBody = data
          ? transformRequest
            ? transformRequest(data)
            : data
          : undefined;

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...fetchOptions?.headers,
          },
          body:
            method !== "GET" && requestBody
              ? JSON.stringify(requestBody)
              : undefined,
          ...fetchOptions,
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMessage =
            result.error || result.message || `Request failed (${response.status})`;
          setState((prev) => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          onError?.(errorMessage);
          return null;
        }

        const transformedData = transformResponse
          ? transformResponse(result)
          : (result as TResponse);

        setState({
          data: transformedData,
          error: null,
          loading: false,
        });

        onSuccess?.(transformedData);
        return transformedData;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
        return null;
      }
    },
    [url, method, transformRequest, transformResponse, onSuccess, onError, fetchOptions]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      loading: false,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    clearError,
  };
}

/**
 * Simplified hook for POST requests
 */
export function usePostApi<TData = void, TResponse = unknown>(
  url: string,
  options?: Omit<ApiCallOptions<TData, TResponse>, "url" | "method">
) {
  return useApiCall<TData, TResponse>({
    method: "POST",
    url,
    ...options,
  });
}

/**
 * Simplified hook for GET requests
 */
export function useGetApi<TResponse = unknown>(
  url: string,
  options?: Omit<ApiCallOptions<void, TResponse>, "url" | "method">
) {
  return useApiCall<void, TResponse>({
    method: "GET",
    url,
    ...options,
  });
}

/**
 * Simplified hook for DELETE requests
 */
export function useDeleteApi<TResponse = unknown>(
  url: string,
  options?: Omit<ApiCallOptions<void, TResponse>, "url" | "method">
) {
  return useApiCall<void, TResponse>({
    method: "DELETE",
    url,
    ...options,
  });
}
