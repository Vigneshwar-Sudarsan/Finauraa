-- Migration: Add new transaction fields for Tarabut data
-- Run this in your Supabase SQL Editor

-- Add new columns to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS provider_id TEXT,
ADD COLUMN IF NOT EXISTS merchant_logo TEXT,
ADD COLUMN IF NOT EXISTS category_group TEXT;

-- Add comments for documentation
COMMENT ON COLUMN transactions.provider_id IS 'Bank provider ID from Tarabut (e.g., SNB, ENBD)';
COMMENT ON COLUMN transactions.merchant_logo IS 'URL to merchant logo from Tarabut';
COMMENT ON COLUMN transactions.category_group IS 'Category group: Expense or Income';

-- Create index for faster filtering by category_group
CREATE INDEX IF NOT EXISTS idx_transactions_category_group ON transactions(category_group);
