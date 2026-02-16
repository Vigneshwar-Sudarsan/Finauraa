export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_timestamp: string
          action_type: string
          correlation_id: string | null
          duration_ms: number | null
          id: string
          ip_address: unknown
          metadata: Json | null
          performed_by: string
          request_details: Json | null
          request_method: string | null
          request_path: string | null
          resource_id: string | null
          resource_type: string
          response_details: Json | null
          response_status: number | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_timestamp?: string
          action_type: string
          correlation_id?: string | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          performed_by: string
          request_details?: Json | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type: string
          response_details?: Json | null
          response_status?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_timestamp?: string
          action_type?: string
          correlation_id?: string | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          performed_by?: string
          request_details?: Json | null
          request_method?: string | null
          request_path?: string | null
          resource_id?: string | null
          resource_type?: string
          response_details?: Json | null
          response_status?: number | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_id: string
          account_number: string
          account_type: string
          available_balance: number | null
          balance: number | null
          connection_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          last_synced_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_number: string
          account_type: string
          available_balance?: number | null
          balance?: number | null
          connection_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_number?: string
          account_type?: string
          available_balance?: number | null
          balance?: number | null
          connection_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          last_synced_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          access_token: string | null
          bank_id: string
          bank_name: string
          consent_expires_at: string | null
          consent_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          refresh_token: string | null
          region: string
          status: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          bank_id: string
          bank_name: string
          consent_expires_at?: string | null
          consent_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          refresh_token?: string | null
          region?: string
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          bank_id?: string
          bank_name?: string
          consent_expires_at?: string | null
          consent_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          refresh_token?: string | null
          region?: string
          status?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          invoice_pdf_url: string | null
          invoice_url: string | null
          metadata: Json | null
          period_end: string | null
          period_start: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          invoice_pdf_url?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          status: string
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          invoice_pdf_url?: string | null
          invoice_url?: string | null
          metadata?: Json | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          currency: string
          end_date: string | null
          family_group_id: string | null
          id: string
          is_active: boolean | null
          period: string | null
          scope: string
          show_member_breakdown: boolean | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          family_group_id?: string | null
          id?: string
          is_active?: boolean | null
          period?: string | null
          scope?: string
          show_member_breakdown?: boolean | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          family_group_id?: string | null
          id?: string
          is_active?: boolean | null
          period?: string | null
          scope?: string
          show_member_breakdown?: boolean | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      contribution_history: {
        Row: {
          amount: number
          contributor_id: string
          created_at: string | null
          currency: string
          goal_id: string
          id: string
          note: string | null
          recorded_by_id: string
        }
        Insert: {
          amount: number
          contributor_id: string
          created_at?: string | null
          currency?: string
          goal_id: string
          id?: string
          note?: string | null
          recorded_by_id: string
        }
        Update: {
          amount?: number
          contributor_id?: string
          created_at?: string | null
          currency?: string
          goal_id?: string
          id?: string
          note?: string | null
          recorded_by_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contribution_history_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_deletion_requests: {
        Row: {
          completed_at: string | null
          consent_id: string | null
          created_at: string
          deletion_type: string
          error_message: string | null
          id: string
          ip_address: unknown
          items_anonymized: number | null
          items_deleted: number | null
          processed_by: string | null
          reason: string | null
          requested_at: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          consent_id?: string | null
          created_at?: string
          deletion_type: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          items_anonymized?: number | null
          items_deleted?: number | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          consent_id?: string | null
          created_at?: string
          deletion_type?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          items_anonymized?: number | null
          items_deleted?: number | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "user_consents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_export_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_expires_at: string | null
          file_size_bytes: number | null
          file_url: string | null
          format: string
          id: string
          include_accounts: boolean | null
          include_consents: boolean | null
          include_messages: boolean | null
          include_profile: boolean | null
          include_transactions: boolean | null
          ip_address: unknown
          requested_at: string
          started_at: string | null
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          include_accounts?: boolean | null
          include_consents?: boolean | null
          include_messages?: boolean | null
          include_profile?: boolean | null
          include_transactions?: boolean | null
          ip_address?: unknown
          requested_at?: string
          started_at?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_expires_at?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          include_accounts?: boolean | null
          include_consents?: boolean | null
          include_messages?: boolean | null
          include_profile?: boolean | null
          include_transactions?: boolean | null
          ip_address?: unknown
          requested_at?: string
          started_at?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_export_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policies: {
        Row: {
          action_on_expiry: string
          anonymization_fields: string[] | null
          created_at: string
          created_by: string | null
          data_type: string
          description: string | null
          id: string
          is_active: boolean
          legal_basis: string | null
          policy_name: string
          post_revocation_retention_days: number
          retention_period_days: number
          updated_at: string
        }
        Insert: {
          action_on_expiry?: string
          anonymization_fields?: string[] | null
          created_at?: string
          created_by?: string | null
          data_type: string
          description?: string | null
          id?: string
          is_active?: boolean
          legal_basis?: string | null
          policy_name: string
          post_revocation_retention_days?: number
          retention_period_days: number
          updated_at?: string
        }
        Update: {
          action_on_expiry?: string
          anonymization_fields?: string[] | null
          created_at?: string
          created_by?: string | null
          data_type?: string
          description?: string | null
          id?: string
          is_active?: boolean
          legal_basis?: string | null
          policy_name?: string
          post_revocation_retention_days?: number
          retention_period_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_retention_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_goal_members: {
        Row: {
          contribution_amount: number | null
          created_at: string | null
          goal_id: string
          id: string
          is_whole_family: boolean
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contribution_amount?: number | null
          created_at?: string | null
          goal_id: string
          id?: string
          is_whole_family?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contribution_amount?: number | null
          created_at?: string | null
          goal_id?: string
          id?: string
          is_whole_family?: boolean
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_goal_members_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string | null
          email: string | null
          group_id: string
          group_name: string | null
          id: string
          invitation_expires_at: string | null
          invitation_token: string | null
          invited_at: string | null
          invited_by: string | null
          inviter_name: string | null
          joined_at: string | null
          role: string
          spending_consent_at: string | null
          spending_consent_given: boolean | null
          spending_consent_ip: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          group_id: string
          group_name?: string | null
          id?: string
          invitation_expires_at?: string | null
          invitation_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          inviter_name?: string | null
          joined_at?: string | null
          role?: string
          spending_consent_at?: string | null
          spending_consent_given?: boolean | null
          spending_consent_ip?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          group_id?: string
          group_name?: string | null
          id?: string
          invitation_expires_at?: string | null
          invitation_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          inviter_name?: string | null
          joined_at?: string | null
          role?: string
          spending_consent_at?: string | null
          spending_consent_given?: boolean | null
          spending_consent_ip?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          feature_flag_id: string | null
          feature_key: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          feature_flag_id?: string | null
          feature_key: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          feature_flag_id?: string | null
          feature_key?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audit_log_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          family_value: Json
          feature_key: string
          feature_name: string
          free_value: Json
          id: string
          is_active: boolean | null
          pro_value: Json
          updated_at: string | null
          updated_by: string | null
          value_type: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          family_value?: Json
          feature_key: string
          feature_name: string
          free_value?: Json
          id?: string
          is_active?: boolean | null
          pro_value?: Json
          updated_at?: string | null
          updated_by?: string | null
          value_type?: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          family_value?: Json
          feature_key?: string
          feature_name?: string
          free_value?: Json
          id?: string
          is_active?: boolean | null
          pro_value?: Json
          updated_at?: string | null
          updated_by?: string | null
          value_type?: string
        }
        Relationships: []
      }
      merchant_scope_defaults: {
        Row: {
          category: string | null
          created_at: string | null
          default_scope: string
          description: string | null
          id: string
          is_active: boolean | null
          merchant_pattern: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_scope?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          merchant_pattern: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_scope?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          merchant_pattern?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          rich_content: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          rich_content?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          rich_content?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_data_mode: string | null
          avatar_url: string | null
          country: string
          created_at: string
          email: string | null
          enhanced_ai_consent_given_at: string | null
          enhanced_ai_consent_ip: string | null
          family_group_id: string | null
          full_name: string | null
          has_seen_dashboard_guide: boolean | null
          has_seen_feature_guide: boolean | null
          id: string
          is_admin: boolean | null
          is_pro: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          ai_data_mode?: string | null
          avatar_url?: string | null
          country?: string
          created_at?: string
          email?: string | null
          enhanced_ai_consent_given_at?: string | null
          enhanced_ai_consent_ip?: string | null
          family_group_id?: string | null
          full_name?: string | null
          has_seen_dashboard_guide?: boolean | null
          has_seen_feature_guide?: boolean | null
          id: string
          is_admin?: boolean | null
          is_pro?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_data_mode?: string | null
          avatar_url?: string | null
          country?: string
          created_at?: string
          email?: string | null
          enhanced_ai_consent_given_at?: string | null
          enhanced_ai_consent_ip?: string | null
          family_group_id?: string | null
          full_name?: string | null
          has_seen_dashboard_guide?: boolean | null
          has_seen_feature_guide?: boolean | null
          id?: string
          is_admin?: boolean | null
          is_pro?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          id: string
          limit_type: string
          updated_at: string | null
          user_id: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          limit_type: string
          updated_at?: string | null
          user_id: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          limit_type?: string
          updated_at?: string | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          auto_contribute: boolean
          auto_contribute_percentage: number | null
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_amount: number
          family_group_id: string | null
          id: string
          is_completed: boolean
          name: string
          scope: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_contribute?: boolean
          auto_contribute_percentage?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_amount?: number
          family_group_id?: string | null
          id?: string
          is_completed?: boolean
          name: string
          scope?: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_contribute?: boolean
          auto_contribute_percentage?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_amount?: number
          family_group_id?: string | null
          id?: string
          is_completed?: boolean
          name?: string
          scope?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_goals_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          booking_date: string | null
          category: string | null
          category_group: string | null
          category_icon: string | null
          consent_id: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_anonymized: boolean | null
          is_manual: boolean
          merchant_logo: string | null
          merchant_name: string | null
          provider_id: string | null
          retention_expires_at: string | null
          transaction_date: string
          transaction_id: string | null
          transaction_scope: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          booking_date?: string | null
          category?: string | null
          category_group?: string | null
          category_icon?: string | null
          consent_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_anonymized?: boolean | null
          is_manual?: boolean
          merchant_logo?: string | null
          merchant_name?: string | null
          provider_id?: string | null
          retention_expires_at?: string | null
          transaction_date: string
          transaction_id?: string | null
          transaction_scope?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          booking_date?: string | null
          category?: string | null
          category_group?: string | null
          category_icon?: string | null
          consent_id?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_anonymized?: boolean | null
          is_manual?: boolean
          merchant_logo?: string | null
          merchant_name?: string | null
          provider_id?: string | null
          retention_expires_at?: string | null
          transaction_date?: string
          transaction_id?: string | null
          transaction_scope?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          consent_expires_at: string
          consent_given_at: string
          consent_status: string
          consent_type: string
          consent_version: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          permissions_granted: string[]
          provider_id: string | null
          provider_name: string | null
          purpose: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          scope: string | null
          tarabut_authorization_id: string | null
          tarabut_consent_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          consent_expires_at: string
          consent_given_at?: string
          consent_status?: string
          consent_type: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          permissions_granted?: string[]
          provider_id?: string | null
          provider_name?: string | null
          purpose: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string | null
          tarabut_authorization_id?: string | null
          tarabut_consent_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          consent_expires_at?: string
          consent_given_at?: string
          consent_status?: string
          consent_type?: string
          consent_version?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          permissions_granted?: string[]
          provider_id?: string | null
          provider_name?: string | null
          purpose?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scope?: string | null
          tarabut_authorization_id?: string | null
          tarabut_consent_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_old_conversations: { Args: never; Returns: number }
      calculate_budget_spent: {
        Args: {
          p_category: string
          p_end_date: string
          p_start_date: string
          p_user_id: string
        }
        Returns: number
      }
      can_view_family_goal: {
        Args: { goal_family_group_id: string; goal_scope: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_limit_type: string
          p_max_count: number
          p_user_id: string
          p_window_seconds: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          reset_at: string
        }[]
      }
      cleanup_old_conversations: { Args: never; Returns: number }
      expire_consents: { Args: never; Returns: number }
      has_active_consent: {
        Args: {
          p_consent_type: string
          p_provider_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_family_member_of: { Args: { check_user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_performed_by?: string
          p_resource_id?: string
          p_resource_type: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
