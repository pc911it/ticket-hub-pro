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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          company_id: string
          created_at: string
          current_location_lat: number | null
          current_location_lng: number | null
          full_name: string
          id: string
          is_available: boolean
          is_online: boolean
          last_location_update: string | null
          phone: string | null
          updated_at: string
          user_id: string
          vehicle_info: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          full_name: string
          id?: string
          is_available?: boolean
          is_online?: boolean
          last_location_update?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          vehicle_info?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          full_name?: string
          id?: string
          is_available?: boolean
          is_online?: boolean
          last_location_update?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          vehicle_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_activity_log: {
        Row: {
          action: string
          bid_id: string
          created_at: string
          description: string | null
          id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          bid_id: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          bid_id?: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_activity_log_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_attachments: {
        Row: {
          bid_id: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          bid_id: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          bid_id?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bid_attachments_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bid_line_items: {
        Row: {
          bid_id: string
          created_at: string
          description: string
          discount_percent: number | null
          id: string
          quantity: number
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          bid_id: string
          created_at?: string
          description: string
          discount_percent?: number | null
          id?: string
          quantity?: number
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Update: {
          bid_id?: string
          created_at?: string
          description?: string
          discount_percent?: number | null
          id?: string
          quantity?: number
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bid_line_items_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          bid_number: string
          client_approval_status: string | null
          client_approved_at: string | null
          client_approved_by: string | null
          client_id: string | null
          client_rejection_reason: string | null
          client_signature_url: string | null
          company_id: string
          converted_at: string | null
          converted_to_invoice_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          id: string
          internal_approval_status: string | null
          internal_approved_at: string | null
          internal_approved_by: string | null
          internal_rejection_reason: string | null
          lost_at: string | null
          notes: string | null
          project_id: string | null
          status: string
          submission_deadline: string | null
          submitted_at: string | null
          title: string
          updated_at: string
          valid_until: string | null
          won_at: string | null
        }
        Insert: {
          amount?: number
          bid_number: string
          client_approval_status?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          client_id?: string | null
          client_rejection_reason?: string | null
          client_signature_url?: string | null
          company_id: string
          converted_at?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          internal_approval_status?: string | null
          internal_approved_at?: string | null
          internal_approved_by?: string | null
          internal_rejection_reason?: string | null
          lost_at?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          submission_deadline?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string
          valid_until?: string | null
          won_at?: string | null
        }
        Update: {
          amount?: number
          bid_number?: string
          client_approval_status?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          client_id?: string | null
          client_rejection_reason?: string | null
          client_signature_url?: string | null
          company_id?: string
          converted_at?: string | null
          converted_to_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          id?: string
          internal_approval_status?: string | null
          internal_approved_at?: string | null
          internal_approved_by?: string | null
          internal_rejection_reason?: string | null
          lost_at?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          submission_deadline?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string
          valid_until?: string | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_history: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          square_payment_id: string | null
          status: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          square_payment_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          square_payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      canned_responses: {
        Row: {
          category: string | null
          company_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          shortcut: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          shortcut?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canned_responses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          comment_id: string
          company_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          comment_id: string
          company_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          company_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoices: {
        Row: {
          amount: number
          client_id: string
          company_id: string
          created_at: string
          currency: string
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          line_items: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          project_id: string | null
          sent_at: string | null
          square_payment_id: string | null
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          due_date: string
          id?: string
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          project_id?: string | null
          sent_at?: string | null
          square_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          project_id?: string | null
          sent_at?: string | null
          square_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payment_plans: {
        Row: {
          amount: number
          billing_interval: string
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_interval?: string
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_interval?: string
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payments: {
        Row: {
          amount: number
          client_id: string
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          invoice_id: string | null
          payment_method: string
          square_payment_id: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          client_id: string
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_method: string
          square_payment_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          payment_method?: string
          square_payment_id?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "client_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_subscriptions: {
        Row: {
          cancelled_at: string | null
          client_id: string
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          payment_method: string
          payment_plan_id: string
          square_card_id: string | null
          square_customer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          client_id: string
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_method?: string
          payment_plan_id: string
          square_card_id?: string | null
          square_customer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          payment_method?: string
          payment_plan_id?: string
          square_card_id?: string | null
          square_customer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_subscriptions_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "client_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_id: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          must_change_password: boolean | null
          notes: string | null
          notification_preferences: Json | null
          phone: string | null
          portal_user_id: string | null
          square_card_id: string | null
          square_customer_id: string | null
          temp_password_created_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          must_change_password?: boolean | null
          notes?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          portal_user_id?: string | null
          square_card_id?: string | null
          square_customer_id?: string | null
          temp_password_created_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          must_change_password?: boolean | null
          notes?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          portal_user_id?: string | null
          square_card_id?: string | null
          square_customer_id?: string | null
          temp_password_created_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          business_config: Json | null
          cancellation_fee_charged: boolean | null
          cancellation_reason: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          payment_provider: string | null
          phone: string | null
          square_card_id: string | null
          square_customer_id: string | null
          state: string | null
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          business_config?: Json | null
          cancellation_fee_charged?: boolean | null
          cancellation_reason?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          payment_provider?: string | null
          phone?: string | null
          square_card_id?: string | null
          square_customer_id?: string | null
          state?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          business_config?: Json | null
          cancellation_fee_charged?: boolean | null
          cancellation_reason?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          payment_provider?: string | null
          phone?: string | null
          square_card_id?: string | null
          square_customer_id?: string | null
          state?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payment_settings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_enabled: boolean | null
          provider: string
          square_access_token_encrypted: string | null
          square_application_id: string | null
          square_environment: string | null
          square_location_id: string | null
          stripe_publishable_key: string | null
          stripe_secret_key_encrypted: string | null
          stripe_webhook_secret_encrypted: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider: string
          square_access_token_encrypted?: string | null
          square_application_id?: string | null
          square_environment?: string | null
          square_location_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_encrypted?: string | null
          stripe_webhook_secret_encrypted?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          provider?: string
          square_access_token_encrypted?: string | null
          square_application_id?: string | null
          square_environment?: string | null
          square_location_id?: string | null
          stripe_publishable_key?: string | null
          stripe_secret_key_encrypted?: string | null
          stripe_webhook_secret_encrypted?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_payment_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_service_types: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_service_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          accepted_at: string | null
          amount: number
          client_id: string
          company_id: string
          converted_to_invoice_id: string | null
          created_at: string
          currency: string
          declined_at: string | null
          description: string | null
          estimate_number: string
          id: string
          line_items: Json | null
          notes: string | null
          project_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          client_id: string
          company_id: string
          converted_to_invoice_id?: string | null
          created_at?: string
          currency?: string
          declined_at?: string | null
          description?: string | null
          estimate_number: string
          id?: string
          line_items?: Json | null
          notes?: string | null
          project_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          client_id?: string
          company_id?: string
          converted_to_invoice_id?: string | null
          created_at?: string
          currency?: string
          declined_at?: string | null
          description?: string | null
          estimate_number?: string
          id?: string
          line_items?: Json | null
          notes?: string | null
          project_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_converted_to_invoice_id_fkey"
            columns: ["converted_to_invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          floor_number: number | null
          id: string
          is_active: boolean | null
          model_type: string | null
          model_url: string | null
          name: string
          project_id: string | null
          thumbnail_url: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          model_type?: string | null
          model_url?: string | null
          name: string
          project_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          floor_number?: number | null
          id?: string
          is_active?: boolean | null
          model_type?: string | null
          model_url?: string | null
          name?: string
          project_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          category: string | null
          company_id: string | null
          cost_per_unit: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          minimum_stock: number | null
          name: string
          quantity_in_stock: number
          sku: string | null
          supplier: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          minimum_stock?: number | null
          name: string
          quantity_in_stock?: number
          sku?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          company_id?: string | null
          cost_per_unit?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          minimum_stock?: number | null
          name?: string
          quantity_in_stock?: number
          sku?: string | null
          supplier?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_usage: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          inventory_item_id: string
          notes: string | null
          quantity_planned: number | null
          quantity_used: number
          ticket_id: string
          usage_type: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          quantity_planned?: number | null
          quantity_used?: number
          ticket_id: string
          usage_type?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          quantity_planned?: number | null
          quantity_used?: number
          ticket_id?: string
          usage_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_usage_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      job_updates: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["job_status"]
          ticket_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_url?: string | null
          status: Database["public"]["Enums"]["job_status"]
          ticket_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_updates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_updates_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          ticket_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          permit_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          permit_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          permit_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permit_documents_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_inspections: {
        Row: {
          completed_date: string | null
          created_at: string
          id: string
          inspection_type: string
          inspector_name: string | null
          notes: string | null
          permit_id: string
          result: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type: string
          inspector_name?: string | null
          notes?: string | null
          permit_id: string
          result?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string
          id?: string
          inspection_type?: string
          inspector_name?: string | null
          notes?: string | null
          permit_id?: string
          result?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_inspections_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          application_date: string | null
          approval_date: string | null
          company_id: string
          conditions: string | null
          created_at: string
          created_by: string | null
          description: string | null
          expiration_date: string | null
          fee_amount: number | null
          fee_paid: boolean | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          notes: string | null
          permit_number: string
          permit_type: string
          project_id: string | null
          renewal_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          application_date?: string | null
          approval_date?: string | null
          company_id: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expiration_date?: string | null
          fee_amount?: number | null
          fee_paid?: boolean | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          permit_number: string
          permit_type: string
          project_id?: string | null
          renewal_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          application_date?: string | null
          approval_date?: string | null
          company_id?: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          expiration_date?: string | null
          fee_amount?: number | null
          fee_paid?: boolean | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          notes?: string | null
          permit_number?: string
          permit_type?: string
          project_id?: string | null
          renewal_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean | null
          limit_value: number | null
          plan_id: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          limit_value?: number | null
          plan_id: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          limit_value?: number | null
          plan_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          password_changed_at: string | null
          require_monthly_password_reset: boolean | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          password_changed_at?: string | null
          require_monthly_password_reset?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          password_changed_at?: string | null
          require_monthly_password_reset?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      project_agents: {
        Row: {
          agent_id: string
          assigned_at: string
          assigned_by: string | null
          id: string
          project_id: string
          role: string | null
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          project_id: string
          role?: string | null
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          project_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_agents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          project_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          company_id: string
          content: string
          created_at: string
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_companies: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          id: string
          invited_by: string
          project_id: string
          role: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_companies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          invited_user_id: string | null
          project_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          invited_user_id?: string | null
          project_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          invited_user_id?: string | null
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          name: string
          project_id: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          name: string
          project_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          name?: string
          project_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          address: string | null
          budget: number | null
          client_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          budget?: number | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          budget?: number | null
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          purchase_order_id: string
          quantity_ordered?: number
          quantity_received?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_number: string
          status: string
          supplier: string | null
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          status?: string
          supplier?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          status?: string
          supplier?: string | null
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          performed_by: string | null
          rfi_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string | null
          rfi_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string | null
          rfi_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_activity_log_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_attachments: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          rfi_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          rfi_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          rfi_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rfi_attachments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_internal: boolean | null
          rfi_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          rfi_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          rfi_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfi_comments_rfi_id_fkey"
            columns: ["rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
        ]
      }
      rfis: {
        Row: {
          answered_at: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          closed_at: string | null
          company_id: string
          created_at: string
          description: string | null
          drawing_reference: string | null
          due_date: string | null
          id: string
          notes: string | null
          partner_company_id: string | null
          partner_submitted: boolean | null
          priority: string | null
          project_id: string | null
          rejection_reason: string | null
          response: string | null
          response_at: string | null
          response_by: string | null
          rfi_number: string
          spec_reference: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          ticket_id: string | null
          title: string
          under_review_at: string | null
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          drawing_reference?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          partner_company_id?: string | null
          partner_submitted?: boolean | null
          priority?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          response?: string | null
          response_at?: string | null
          response_by?: string | null
          rfi_number: string
          spec_reference?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          ticket_id?: string | null
          title: string
          under_review_at?: string | null
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          drawing_reference?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          partner_company_id?: string | null
          partner_submitted?: boolean | null
          priority?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          response?: string | null
          response_at?: string | null
          response_by?: string | null
          rfi_number?: string
          spec_reference?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          ticket_id?: string | null
          title?: string
          under_review_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_partner_company_id_fkey"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfis_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_activity_log: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          performed_by: string | null
          submittal_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string | null
          submittal_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          performed_by?: string | null
          submittal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittal_activity_log_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_attachments: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          revision_id: string | null
          submittal_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          revision_id?: string | null
          submittal_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          revision_id?: string | null
          submittal_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_attachments_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "submittal_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittal_attachments_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittal_revisions: {
        Row: {
          changes_description: string | null
          created_at: string
          id: string
          review_comments: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_number: number
          status: string | null
          submittal_id: string
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          changes_description?: string | null
          created_at?: string
          id?: string
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number: number
          status?: string | null
          submittal_id: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          changes_description?: string | null
          created_at?: string
          id?: string
          review_comments?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_number?: number
          status?: string | null
          submittal_id?: string
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submittal_revisions_submittal_id_fkey"
            columns: ["submittal_id"]
            isOneToOne: false
            referencedRelation: "submittals"
            referencedColumns: ["id"]
          },
        ]
      }
      submittals: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          description: string | null
          drawing_reference: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          project_id: string | null
          rejection_reason: string | null
          revision_number: number | null
          spec_section: string | null
          status: string
          submittal_number: string
          submitted_at: string | null
          submitted_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          drawing_reference?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          revision_number?: number | null
          spec_section?: string | null
          status?: string
          submittal_number: string
          submitted_at?: string | null
          submitted_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          drawing_reference?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_id?: string | null
          rejection_reason?: string | null
          revision_number?: number | null
          spec_section?: string | null
          status?: string
          submittal_number?: string
          submitted_at?: string | null
          submitted_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submittals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submittals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          company_id: string | null
          contact_name: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_messages: {
        Row: {
          channel: string | null
          chat_id: string
          content: string
          created_at: string
          id: string
          sender_id: string | null
          sender_type: string
        }
        Insert: {
          channel?: string | null
          chat_id: string
          content: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type: string
        }
        Update: {
          channel?: string | null
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chats: {
        Row: {
          assigned_agent_id: string | null
          channel: string
          created_at: string
          department: string | null
          ended_at: string | null
          ended_by: string | null
          id: string
          order_reference: string | null
          status: string
          topic: string | null
          transfer_reason: string | null
          transferred_from: string | null
          updated_at: string
          visitor_email: string | null
          visitor_id: string
          visitor_name: string | null
          visitor_phone: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          channel?: string
          created_at?: string
          department?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          order_reference?: string | null
          status?: string
          topic?: string | null
          transfer_reason?: string | null
          transferred_from?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_id: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          channel?: string
          created_at?: string
          department?: string | null
          ended_at?: string | null
          ended_by?: string | null
          id?: string
          order_reference?: string | null
          status?: string
          topic?: string | null
          transfer_reason?: string | null
          transferred_from?: string | null
          updated_at?: string
          visitor_email?: string | null
          visitor_id?: string
          visitor_name?: string | null
          visitor_phone?: string | null
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_staff_reply: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean | null
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff_reply?: boolean | null
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          created_at: string
          department: string | null
          description: string
          id: string
          priority: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          description: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          ticket_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          ticket_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          ticket_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_views: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          filters: Json | null
          id: string
          is_default: boolean | null
          name: string
          sort_by: string | null
          sort_order: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_by?: string | null
          sort_order?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_by?: string | null
          sort_order?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          admin_approval_status: string | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          admin_rejection_reason: string | null
          assigned_agent_id: string | null
          call_ended_at: string | null
          call_started_at: string | null
          call_type: string | null
          client_approved_at: string | null
          client_approved_by: string | null
          client_id: string | null
          client_signature_url: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          priority: string | null
          project_id: string
          scheduled_date: string
          scheduled_time: string
          status: string | null
          title: string
          total_time_minutes: number | null
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          admin_approval_status?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejection_reason?: string | null
          assigned_agent_id?: string | null
          call_ended_at?: string | null
          call_started_at?: string | null
          call_type?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          client_id?: string | null
          client_signature_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          priority?: string | null
          project_id: string
          scheduled_date: string
          scheduled_time: string
          status?: string | null
          title: string
          total_time_minutes?: number | null
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          admin_approval_status?: string | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          admin_rejection_reason?: string | null
          assigned_agent_id?: string | null
          call_ended_at?: string | null
          call_started_at?: string | null
          call_type?: string | null
          client_approved_at?: string | null
          client_approved_by?: string | null
          client_id?: string | null
          client_signature_url?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          priority?: string | null
          project_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string | null
          title?: string
          total_time_minutes?: number | null
          updated_at?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      time_clock_entries: {
        Row: {
          agent_id: string
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          company_id: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_clock_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_clock_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_report_submissions: {
        Row: {
          agent_id: string
          company_id: string
          id: string
          notes: string | null
          period_end: string
          period_start: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string
          total_clock_minutes: number | null
          total_ticket_minutes: number | null
        }
        Insert: {
          agent_id: string
          company_id: string
          id?: string
          notes?: string | null
          period_end: string
          period_start: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string
          total_clock_minutes?: number | null
          total_ticket_minutes?: number | null
        }
        Update: {
          agent_id?: string
          company_id?: string
          id?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string
          total_clock_minutes?: number | null
          total_ticket_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "time_report_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_report_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          identifier: string
          type: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          type: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          type?: string
          verified?: boolean
        }
        Relationships: []
      }
      vessel_photos: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          ticket_id: string | null
          uploaded_by: string | null
          vessel_id: string
        }
        Insert: {
          category?: string
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          ticket_id?: string | null
          uploaded_by?: string | null
          vessel_id: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          ticket_id?: string | null
          uploaded_by?: string | null
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessel_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_photos_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_photos_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      vessels: {
        Row: {
          boat_name: string
          client_id: string
          company_id: string
          created_at: string
          deleted_at: string | null
          engine_type: string | null
          fuel_type: string | null
          hull_id: string | null
          id: string
          length: string | null
          make: string | null
          model: string | null
          notes: string | null
          slip_location: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          boat_name: string
          client_id: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          engine_type?: string | null
          fuel_type?: string | null
          hull_id?: string | null
          id?: string
          length?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          slip_location?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          boat_name?: string
          client_id?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          engine_type?: string | null
          fuel_type?: string | null
          hull_id?: string | null
          id?: string
          length?: string | null
          make?: string | null
          model?: string | null
          notes?: string | null
          slip_location?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vessels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_company: { Args: { _company_id: string }; Returns: boolean }
      can_insert_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      get_user_company_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_company_ids_direct: {
        Args: { _user_id: string }
        Returns: string[]
      }
      has_project_access: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_owner: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_employee_role: { Args: { _user_id: string }; Returns: boolean }
      is_project_partner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      purge_old_deleted_items: { Args: never; Returns: undefined }
      reject_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff" | "user" | "client" | "super_admin"
      company_type:
        | "alarm_company"
        | "tow_company"
        | "other"
        | "electrician"
        | "plumber"
        | "hvac"
        | "security"
        | "locksmith"
        | "boat_services"
      job_status:
        | "assigned"
        | "en_route"
        | "on_site"
        | "working"
        | "completed"
        | "cancelled"
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
    Enums: {
      app_role: ["admin", "staff", "user", "client", "super_admin"],
      company_type: [
        "alarm_company",
        "tow_company",
        "other",
        "electrician",
        "plumber",
        "hvac",
        "security",
        "locksmith",
        "boat_services",
      ],
      job_status: [
        "assigned",
        "en_route",
        "on_site",
        "working",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
