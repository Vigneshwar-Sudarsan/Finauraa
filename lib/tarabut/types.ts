/**
 * Tarabut Gateway Open Banking API Types
 * Based on Tarabut's centralized API
 */

// Error types
export interface TarabutError {
  code: string;
  message: string;
  details?: string;
}

export interface TarabutErrorResponse {
  error?: TarabutError;
  errors?: TarabutError[];
  message?: string;
}
