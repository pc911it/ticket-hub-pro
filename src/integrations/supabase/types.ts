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
      ai_takeoff_items: {
        Row: {
          confidence_score: number | null
          created_at: string
          dimensions: Json | null
          id: string
          is_verified: boolean | null
          item_type: string
          label: string | null
          location_on_plan: Json | null
          notes: string | null
          quantity: number | null
          session_id: string
          unit: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          dimensions?: Json | null
          id?: string
          is_verified?: boolean | null
          item_type: string
          label?: string | null
          location_on_plan?: Json | null
          notes?: string | null
          quantity?: number | null
          session_id: string
          unit?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          dimensions?: Json | null
          id?: string
          is_verified?: boolean | null
          item_type?: string
          label?: string | null
          location_on_plan?: Json | null
          notes?: string | null
          quantity?: number | null
          session_id?: string
          unit?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_takeoff_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_takeoff_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_takeoff_sessions: {
        Row: {
          ai_model_used: string | null
          company_id: string
          created_at: string
          created_by: string | null
          document_name: string | null
          document_url: string | null
          error_message: string | null
          floor_plan_id: string | null
          id: string
          processing_completed_at: string | null
          processing_started_at: string | null
          project_id: string | null
          status: string | null
        }
        Insert: {
          ai_model_used?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          error_message?: string | null
          floor_plan_id?: string | null
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id?: string | null
          status?: string | null
        }
        Update: {
          ai_model_used?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          document_name?: string | null
          document_url?: string | null
          error_message?: string | null
          floor_plan_id?: string | null
          id?: string
          processing_completed_at?: string | null
          processing_started_at?: string | null
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_takeoff_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_takeoff_sessions_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_takeoff_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempts_count: number | null
          blocked_until: string | null
          email: string | null
          first_attempt_at: string | null
          id: string
          ip_address: string
          last_attempt_at: string | null
        }
        Insert: {
          attempt_type: string
          attempts_count?: number | null
          blocked_until?: string | null
          email?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address: string
          last_attempt_at?: string | null
        }
        Update: {
          attempt_type?: string
          attempts_count?: number | null
          blocked_until?: string | null
          email?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: string
          last_attempt_at?: string | null
        }
        Relationships: []
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
      budget_line_items: {
        Row: {
          actual_total: number | null
          budget_id: string
          category: string
          cost_code: string | null
          created_at: string
          description: string
          estimated_quantity: number | null
          estimated_total: number | null
          id: string
          notes: string | null
          sort_order: number | null
          unit: string | null
          unit_cost: number | null
          updated_at: string
          variance: number | null
        }
        Insert: {
          actual_total?: number | null
          budget_id: string
          category: string
          cost_code?: string | null
          created_at?: string
          description: string
          estimated_quantity?: number | null
          estimated_total?: number | null
          id?: string
          notes?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          variance?: number | null
        }
        Update: {
          actual_total?: number | null
          budget_id?: string
          category?: string
          cost_code?: string | null
          created_at?: string
          description?: string
          estimated_quantity?: number | null
          estimated_total?: number | null
          id?: string
          notes?: string | null
          sort_order?: number | null
          unit?: string | null
          unit_cost?: number | null
          updated_at?: string
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_line_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "project_budgets"
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
      change_order_items: {
        Row: {
          change_order_id: string
          created_at: string
          description: string
          id: string
          quantity: number | null
          sort_order: number | null
          total: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          change_order_id: string
          created_at?: string
          description: string
          id?: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          change_order_id?: string
          created_at?: string
          description?: string
          id?: string
          quantity?: number | null
          sort_order?: number | null
          total?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "change_order_items_change_order_id_fkey"
            columns: ["change_order_id"]
            isOneToOne: false
            referencedRelation: "change_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      change_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_order_number: string
          client_approved_at: string | null
          client_approved_by: string | null
          client_id: string | null
          client_signature_url: string | null
          company_id: string
          cost_impact: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          original_amount: number | null
          project_id: string
          reason: string | null
          rejection_reason: string | null
          requested_by: string | null
          requested_date: string | null
          revised_amount: number | null
          schedule_impact_days: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_order_number: string
          client_approved_at?: string | null
          client_approved_by?: string | null
          client_id?: string | null
          client_signature_url?: string | null
          company_id: string
          cost_impact?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          original_amount?: number | null
          project_id: string
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_date?: string | null
          revised_amount?: number | null
          schedule_impact_days?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_order_number?: string
          client_approved_at?: string | null
          client_approved_by?: string | null
          client_id?: string | null
          client_signature_url?: string | null
          company_id?: string
          cost_impact?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          original_amount?: number | null
          project_id?: string
          reason?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_date?: string | null
          revised_amount?: number | null
          schedule_impact_days?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          billing_cycle: string | null
          business_config: Json | null
          cancellation_fee_charged: boolean | null
          cancellation_reason: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          discount_fixed_amount: number | null
          discount_percentage: number | null
          email: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          next_billing_date: string | null
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
          billing_cycle?: string | null
          business_config?: Json | null
          cancellation_fee_charged?: boolean | null
          cancellation_reason?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          discount_fixed_amount?: number | null
          discount_percentage?: number | null
          email: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          next_billing_date?: string | null
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
          billing_cycle?: string | null
          business_config?: Json | null
          cancellation_fee_charged?: boolean | null
          cancellation_reason?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          discount_fixed_amount?: number | null
          discount_percentage?: number | null
          email?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          next_billing_date?: string | null
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
      company_feature_overrides: {
        Row: {
          company_id: string
          created_at: string
          feature_key: string
          id: string
          is_enabled: boolean
          limit_value: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          feature_key: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          feature_key?: string
          id?: string
          is_enabled?: boolean
          limit_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_feature_overrides_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_integrations: {
        Row: {
          access_token_encrypted: string | null
          company_id: string
          created_at: string
          id: string
          is_connected: boolean | null
          last_sync_at: string | null
          provider: string
          realm_id: string | null
          refresh_token_encrypted: string | null
          sync_settings: Json | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          provider: string
          realm_id?: string | null
          refresh_token_encrypted?: string | null
          sync_settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_connected?: boolean | null
          last_sync_at?: string | null
          provider?: string
          realm_id?: string | null
          refresh_token_encrypted?: string | null
          sync_settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      company_promo_codes: {
        Row: {
          applied_at: string
          company_id: string
          discount_applied: number | null
          id: string
          is_recurring: boolean | null
          promo_code_id: string
          trial_extended_days: number | null
        }
        Insert: {
          applied_at?: string
          company_id: string
          discount_applied?: number | null
          id?: string
          is_recurring?: boolean | null
          promo_code_id: string
          trial_extended_days?: number | null
        }
        Update: {
          applied_at?: string
          company_id?: string
          discount_applied?: number | null
          id?: string
          is_recurring?: boolean | null
          promo_code_id?: string
          trial_extended_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_promo_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_promo_codes_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
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
      contracts: {
        Row: {
          amount: number | null
          client_id: string | null
          client_signature_url: string | null
          client_signed_by: string | null
          company_id: string
          company_signature_url: string | null
          company_signed_by: string | null
          contract_number: string
          contract_type: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          end_date: string | null
          id: string
          payment_terms: string | null
          project_id: string | null
          scope_of_work: string | null
          sent_at: string | null
          signed_at: string | null
          start_date: string | null
          status: string
          terms_and_conditions: string | null
          title: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          amount?: number | null
          client_id?: string | null
          client_signature_url?: string | null
          client_signed_by?: string | null
          company_id: string
          company_signature_url?: string | null
          company_signed_by?: string | null
          contract_number: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          payment_terms?: string | null
          project_id?: string | null
          scope_of_work?: string | null
          sent_at?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string
          terms_and_conditions?: string | null
          title: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          amount?: number | null
          client_id?: string | null
          client_signature_url?: string | null
          client_signed_by?: string | null
          company_id?: string
          company_signature_url?: string | null
          company_signed_by?: string | null
          contract_number?: string
          contract_type?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string | null
          id?: string
          payment_terms?: string | null
          project_id?: string | null
          scope_of_work?: string | null
          sent_at?: string | null
          signed_at?: string | null
          start_date?: string | null
          status?: string
          terms_and_conditions?: string | null
          title?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_templates: {
        Row: {
          category: string
          company_id: string
          created_at: string
          crew_size: number | null
          description: string | null
          id: string
          is_active: boolean | null
          labor_hours_per_unit: number | null
          markup_percent: number | null
          name: string
          productivity_rate: number | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          crew_size?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          labor_hours_per_unit?: number | null
          markup_percent?: number | null
          name: string
          productivity_rate?: number | null
          unit: string
          unit_cost: number
          updated_at?: string
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          crew_size?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          labor_hours_per_unit?: number | null
          markup_percent?: number | null
          name?: string
          productivity_rate?: number | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_labor: {
        Row: {
          created_at: string
          daily_log_id: string
          hours_worked: number | null
          id: string
          notes: string | null
          trade: string | null
          worker_name: string
        }
        Insert: {
          created_at?: string
          daily_log_id: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          trade?: string | null
          worker_name: string
        }
        Update: {
          created_at?: string
          daily_log_id?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          trade?: string | null
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_labor_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_log_photos: {
        Row: {
          caption: string | null
          created_at: string
          daily_log_id: string
          id: string
          photo_url: string
          taken_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          daily_log_id: string
          id?: string
          photo_url: string
          taken_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          daily_log_id?: string
          id?: string
          photo_url?: string
          taken_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_log_photos_daily_log_id_fkey"
            columns: ["daily_log_id"]
            isOneToOne: false
            referencedRelation: "daily_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          crew_count: number | null
          delays_issues: string | null
          equipment_used: string | null
          hours_worked: number | null
          id: string
          log_date: string
          materials_used: string | null
          notes: string | null
          project_id: string
          safety_incidents: string | null
          submitted_at: string | null
          submitted_by: string | null
          temperature_high: number | null
          temperature_low: number | null
          updated_at: string
          visitor_log: string | null
          weather_conditions: string | null
          work_performed: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          crew_count?: number | null
          delays_issues?: string | null
          equipment_used?: string | null
          hours_worked?: number | null
          id?: string
          log_date: string
          materials_used?: string | null
          notes?: string | null
          project_id: string
          safety_incidents?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          temperature_high?: number | null
          temperature_low?: number | null
          updated_at?: string
          visitor_log?: string | null
          weather_conditions?: string | null
          work_performed?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          crew_count?: number | null
          delays_issues?: string | null
          equipment_used?: string | null
          hours_worked?: number | null
          id?: string
          log_date?: string
          materials_used?: string | null
          notes?: string | null
          project_id?: string
          safety_incidents?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          temperature_high?: number | null
          temperature_low?: number | null
          updated_at?: string
          visitor_log?: string | null
          weather_conditions?: string | null
          work_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_project_id: string | null
          assigned_to: string | null
          company_id: string
          created_at: string
          current_location: string | null
          current_value: number | null
          equipment_type: string | null
          id: string
          insurance_expiry: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          photo_url: string | null
          purchase_date: string | null
          purchase_price: number | null
          registration_expiry: string | null
          serial_number: string | null
          status: string
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          assigned_project_id?: string | null
          assigned_to?: string | null
          company_id: string
          created_at?: string
          current_location?: string | null
          current_value?: number | null
          equipment_type?: string | null
          id?: string
          insurance_expiry?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          assigned_project_id?: string | null
          assigned_to?: string | null
          company_id?: string
          created_at?: string
          current_location?: string | null
          current_value?: number | null
          equipment_type?: string | null
          id?: string
          insurance_expiry?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          photo_url?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          registration_expiry?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assigned_project_id_fkey"
            columns: ["assigned_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_logs: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          equipment_id: string
          fuel_cost: number | null
          fuel_gallons: number | null
          hours_used: number | null
          id: string
          log_date: string
          log_type: string
          maintenance_cost: number | null
          maintenance_type: string | null
          mileage: number | null
          operator_name: string | null
          project_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_id: string
          fuel_cost?: number | null
          fuel_gallons?: number | null
          hours_used?: number | null
          id?: string
          log_date: string
          log_type: string
          maintenance_cost?: number | null
          maintenance_type?: string | null
          mileage?: number | null
          operator_name?: string | null
          project_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment_id?: string
          fuel_cost?: number | null
          fuel_gallons?: number | null
          hours_used?: number | null
          id?: string
          log_date?: string
          log_type?: string
          maintenance_cost?: number | null
          maintenance_type?: string | null
          mileage?: number | null
          operator_name?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_logs_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      follow_up_reminders: {
        Row: {
          assigned_to: string | null
          auto_generated: boolean | null
          client_id: string | null
          company_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_date: string
          id: string
          lead_id: string | null
          priority: string | null
          project_id: string | null
          reminder_type: string
          snoozed_until: string | null
          status: string | null
          title: string
          updated_at: string
          warranty_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          auto_generated?: boolean | null
          client_id?: string | null
          company_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          lead_id?: string | null
          priority?: string | null
          project_id?: string | null
          reminder_type: string
          snoozed_until?: string | null
          status?: string | null
          title: string
          updated_at?: string
          warranty_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          auto_generated?: boolean | null
          client_id?: string | null
          company_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          lead_id?: string | null
          priority?: string | null
          project_id?: string | null
          reminder_type?: string
          snoozed_until?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          warranty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_reminders_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_checklists: {
        Row: {
          created_at: string
          id: string
          inspection_id: string
          is_passed: boolean | null
          item_name: string
          notes: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          inspection_id: string
          is_passed?: boolean | null
          item_name: string
          notes?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          inspection_id?: string
          is_passed?: boolean | null
          item_name?: string
          notes?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checklists_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          company_id: string
          completed_date: string | null
          created_at: string
          created_by: string | null
          deficiencies: string | null
          description: string | null
          id: string
          inspection_number: string
          inspection_type: string
          inspector_company: string | null
          inspector_name: string | null
          permit_id: string | null
          project_id: string
          reinspection_date: string | null
          reinspection_required: boolean | null
          result: string | null
          result_notes: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deficiencies?: string | null
          description?: string | null
          id?: string
          inspection_number: string
          inspection_type: string
          inspector_company?: string | null
          inspector_name?: string | null
          permit_id?: string | null
          project_id: string
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          result?: string | null
          result_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completed_date?: string | null
          created_at?: string
          created_by?: string | null
          deficiencies?: string | null
          description?: string | null
          id?: string
          inspection_number?: string
          inspection_type?: string
          inspector_company?: string | null
          inspector_name?: string | null
          permit_id?: string | null
          project_id?: string
          reinspection_date?: string | null
          reinspection_required?: boolean | null
          result?: string | null
          result_notes?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_project_id_fkey"
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
            foreignKeyName: "inventory_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_safe"
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
      job_costs: {
        Row: {
          budget_line_item_id: string | null
          category: string
          company_id: string
          cost_code: string | null
          cost_date: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          invoice_number: string | null
          notes: string | null
          payment_status: string | null
          project_id: string
          quantity: number | null
          total_cost: number
          unit: string | null
          unit_cost: number | null
          vendor_supplier: string | null
        }
        Insert: {
          budget_line_item_id?: string | null
          category: string
          company_id: string
          cost_code?: string | null
          cost_date: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_status?: string | null
          project_id: string
          quantity?: number | null
          total_cost: number
          unit?: string | null
          unit_cost?: number | null
          vendor_supplier?: string | null
        }
        Update: {
          budget_line_item_id?: string | null
          category?: string
          company_id?: string
          cost_code?: string | null
          cost_date?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          invoice_number?: string | null
          notes?: string | null
          payment_status?: string | null
          project_id?: string
          quantity?: number | null
          total_cost?: number
          unit?: string | null
          unit_cost?: number | null
          vendor_supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_costs_budget_line_item_id_fkey"
            columns: ["budget_line_item_id"]
            isOneToOne: false
            referencedRelation: "budget_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_costs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
            foreignKeyName: "job_updates_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_safe"
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
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          id: string
          lead_id: string
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id: string
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          id?: string
          lead_id?: string
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          address: string | null
          assigned_to: string | null
          city: string | null
          company_id: string
          converted_at: string | null
          converted_to_client_id: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          full_name: string
          id: string
          lost_reason: string | null
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          source: string | null
          state: string | null
          status: string
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_id: string
          converted_at?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          full_name: string
          id?: string
          lost_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          city?: string | null
          company_id?: string
          converted_at?: string | null
          converted_to_client_id?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          full_name?: string
          id?: string
          lost_reason?: string | null
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          source?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_to_client_id_fkey"
            columns: ["converted_to_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_board_items: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          height: number | null
          id: string
          image_url: string | null
          item_type: string
          mood_board_id: string
          position_x: number | null
          position_y: number | null
          product_id: string | null
          sort_order: number | null
          title: string | null
          width: number | null
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          item_type: string
          mood_board_id: string
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          sort_order?: number | null
          title?: string | null
          width?: number | null
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          item_type?: string
          mood_board_id?: string
          position_x?: number | null
          position_y?: number | null
          product_id?: string | null
          sort_order?: number | null
          title?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mood_board_items_mood_board_id_fkey"
            columns: ["mood_board_id"]
            isOneToOne: false
            referencedRelation: "mood_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_board_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_items"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_boards: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string | null
          shared_at: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          shared_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          shared_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_boards_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_boards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_boards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      offline_sync_queue: {
        Row: {
          action: string
          company_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          payload: Json
          retry_count: number | null
          status: string | null
          synced_at: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          payload: Json
          retry_count?: number | null
          status?: string | null
          synced_at?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          payload?: Json
          retry_count?: number | null
          status?: string | null
          synced_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_sync_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      plan_markups: {
        Row: {
          color: string | null
          company_id: string
          content: string | null
          created_at: string
          created_by: string | null
          floor_plan_id: string | null
          font_size: number | null
          height: number | null
          id: string
          linked_punch_item_id: string | null
          linked_rfi_id: string | null
          markup_type: string
          page_number: number | null
          points: Json | null
          position_x: number | null
          position_y: number | null
          project_id: string | null
          rotation: number | null
          stroke_width: number | null
          updated_at: string
          width: number | null
        }
        Insert: {
          color?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          floor_plan_id?: string | null
          font_size?: number | null
          height?: number | null
          id?: string
          linked_punch_item_id?: string | null
          linked_rfi_id?: string | null
          markup_type: string
          page_number?: number | null
          points?: Json | null
          position_x?: number | null
          position_y?: number | null
          project_id?: string | null
          rotation?: number | null
          stroke_width?: number | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          color?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          floor_plan_id?: string | null
          font_size?: number | null
          height?: number | null
          id?: string
          linked_punch_item_id?: string | null
          linked_rfi_id?: string | null
          markup_type?: string
          page_number?: number | null
          points?: Json | null
          position_x?: number | null
          position_y?: number | null
          project_id?: string | null
          rotation?: number | null
          stroke_width?: number | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_markups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_markups_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_markups_linked_punch_item_id_fkey"
            columns: ["linked_punch_item_id"]
            isOneToOne: false
            referencedRelation: "punch_list_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_markups_linked_rfi_id_fkey"
            columns: ["linked_rfi_id"]
            isOneToOne: false
            referencedRelation: "rfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_markups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_catalogs: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_catalogs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_items: {
        Row: {
          brand: string | null
          catalog_id: string
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          lead_time_days: number | null
          manufacturer: string | null
          name: string
          sku: string | null
          specifications: Json | null
          supplier_id: string | null
          unit: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          catalog_id: string
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          lead_time_days?: number | null
          manufacturer?: string | null
          name: string
          sku?: string | null
          specifications?: Json | null
          supplier_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          catalog_id?: string
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          lead_time_days?: number | null
          manufacturer?: string | null
          name?: string
          sku?: string | null
          specifications?: Json | null
          supplier_id?: string | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_items_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "product_catalogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "project_agents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_safe"
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
      project_budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          contingency_percent: number | null
          created_at: string
          equipment_budget: number | null
          id: string
          labor_budget: number | null
          materials_budget: number | null
          overhead_budget: number | null
          profit_margin_percent: number | null
          project_id: string
          status: string | null
          subcontractor_budget: number | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          contingency_percent?: number | null
          created_at?: string
          equipment_budget?: number | null
          id?: string
          labor_budget?: number | null
          materials_budget?: number | null
          overhead_budget?: number | null
          profit_margin_percent?: number | null
          project_id: string
          status?: string | null
          subcontractor_budget?: number | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          contingency_percent?: number | null
          created_at?: string
          equipment_budget?: number | null
          id?: string
          labor_budget?: number | null
          materials_budget?: number | null
          overhead_budget?: number | null
          profit_margin_percent?: number | null
          project_id?: string
          status?: string | null
          subcontractor_budget?: number | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_budgets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
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
      promo_codes: {
        Row: {
          applicable_plans: string[] | null
          applies_to_renewals: boolean | null
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          first_time_only: boolean | null
          id: string
          is_active: boolean
          is_recurring: boolean | null
          is_stackable: boolean | null
          max_uses: number | null
          min_purchase_amount: number | null
          name: string
          promo_category: string | null
          recurring_interval: string | null
          referral_bonus_type: string | null
          referral_bonus_value: number | null
          trial_extension_days: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          applies_to_renewals?: boolean | null
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value?: number
          first_time_only?: boolean | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean | null
          is_stackable?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          name: string
          promo_category?: string | null
          recurring_interval?: string | null
          referral_bonus_type?: string | null
          referral_bonus_value?: number | null
          trial_extension_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          applies_to_renewals?: boolean | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          first_time_only?: boolean | null
          id?: string
          is_active?: boolean
          is_recurring?: boolean | null
          is_stackable?: boolean | null
          max_uses?: number | null
          min_purchase_amount?: number | null
          name?: string
          promo_category?: string | null
          recurring_interval?: string | null
          referral_bonus_type?: string | null
          referral_bonus_value?: number | null
          trial_extension_days?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      promo_email_campaigns: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          promo_code_id: string
          recipient_emails: string[] | null
          scheduled_for: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          promo_code_id: string
          recipient_emails?: string[] | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          promo_code_id?: string
          recipient_emails?: string[] | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_email_campaigns_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_list_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string
          id: string
          item_number: number | null
          location: string | null
          notes: string | null
          photo_url: string | null
          priority: string | null
          punch_list_id: string
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description: string
          id?: string
          item_number?: number | null
          location?: string | null
          notes?: string | null
          photo_url?: string | null
          priority?: string | null
          punch_list_id: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string
          id?: string
          item_number?: number | null
          location?: string | null
          notes?: string | null
          photo_url?: string | null
          priority?: string | null
          punch_list_id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_list_items_punch_list_id_fkey"
            columns: ["punch_list_id"]
            isOneToOne: false
            referencedRelation: "punch_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      punch_lists: {
        Row: {
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string
          title: string
          updated_at: string
          walkthrough_date: string | null
        }
        Insert: {
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
          walkthrough_date?: string | null
        }
        Update: {
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
          walkthrough_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "punch_lists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "punch_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      quickbooks_financial_cache: {
        Row: {
          company_id: string
          created_at: string
          data: Json
          data_type: string
          fetched_at: string
          id: string
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: Json
          data_type: string
          fetched_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: Json
          data_type?: string
          fetched_at?: string
          id?: string
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_financial_cache_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean | null
          owner_company_id: string | null
          owner_user_id: string | null
          promo_code_id: string | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          owner_company_id?: string | null
          owner_user_id?: string | null
          promo_code_id?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          owner_company_id?: string | null
          owner_user_id?: string | null
          promo_code_id?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_owner_company_id_fkey"
            columns: ["owner_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_uses: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code_id: string
          referred_bonus_amount: number | null
          referred_company_id: string
          referrer_bonus_amount: number | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code_id: string
          referred_bonus_amount?: number | null
          referred_company_id: string
          referrer_bonus_amount?: number | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code_id?: string
          referred_bonus_amount?: number | null
          referred_company_id?: string
          referrer_bonus_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_uses_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_uses_referred_company_id_fkey"
            columns: ["referred_company_id"]
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
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      selections: {
        Row: {
          allowance_amount: number | null
          category: string
          client_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          item_name: string
          notes: string | null
          ordered_at: string | null
          photo_url: string | null
          product_details: string | null
          project_id: string
          selected_amount: number | null
          selected_at: string | null
          status: string
          updated_at: string
          variance: number | null
          vendor: string | null
        }
        Insert: {
          allowance_amount?: number | null
          category: string
          client_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_name: string
          notes?: string | null
          ordered_at?: string | null
          photo_url?: string | null
          product_details?: string | null
          project_id: string
          selected_amount?: number | null
          selected_at?: string | null
          status?: string
          updated_at?: string
          variance?: number | null
          vendor?: string | null
        }
        Update: {
          allowance_amount?: number | null
          category?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          ordered_at?: string | null
          photo_url?: string | null
          product_details?: string | null
          project_id?: string
          selected_amount?: number | null
          selected_at?: string | null
          status?: string
          updated_at?: string
          variance?: number | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "selections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_access_log: {
        Row: {
          accessed_at: string
          accessed_by: string | null
          id: string
          ip_address: string | null
          record_id: string
          signature_type: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          accessed_by?: string | null
          id?: string
          ip_address?: string | null
          record_id: string
          signature_type: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          accessed_by?: string | null
          id?: string
          ip_address?: string | null
          record_id?: string
          signature_type?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      site_locations: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location_type: string | null
          longitude: number | null
          name: string
          photo_url: string | null
          project_id: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name: string
          photo_url?: string | null
          project_id?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name?: string
          photo_url?: string | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_locations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_locations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractor_assignments: {
        Row: {
          company_id: string
          completion_percent: number | null
          contract_amount: number | null
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          performance_rating: number | null
          project_id: string
          scope_of_work: string | null
          start_date: string | null
          status: string | null
          subcontractor_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          completion_percent?: number | null
          contract_amount?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          performance_rating?: number | null
          project_id: string
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          completion_percent?: number | null
          contract_amount?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          performance_rating?: number | null
          project_id?: string
          scope_of_work?: string | null
          start_date?: string | null
          status?: string | null
          subcontractor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcontractor_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcontractor_assignments_subcontractor_id_fkey"
            columns: ["subcontractor_id"]
            isOneToOne: false
            referencedRelation: "subcontractors"
            referencedColumns: ["id"]
          },
        ]
      }
      subcontractors: {
        Row: {
          address: string | null
          business_name: string
          city: string | null
          coi_on_file: boolean | null
          company_id: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          insurance_expiry: string | null
          license_expiry: string | null
          license_number: string | null
          notes: string | null
          phone: string | null
          rating: number | null
          state: string | null
          status: string | null
          total_projects: number | null
          trades: string[] | null
          updated_at: string
          w9_on_file: boolean | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          city?: string | null
          coi_on_file?: boolean | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          license_expiry?: string | null
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          state?: string | null
          status?: string | null
          total_projects?: number | null
          trades?: string[] | null
          updated_at?: string
          w9_on_file?: boolean | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          city?: string | null
          coi_on_file?: boolean | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_expiry?: string | null
          license_expiry?: string | null
          license_number?: string | null
          notes?: string | null
          phone?: string | null
          rating?: number | null
          state?: string | null
          status?: string | null
          total_projects?: number | null
          trades?: string[] | null
          updated_at?: string
          w9_on_file?: boolean | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcontractors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          {
            foreignKeyName: "support_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "support_chats_anonymized"
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
          session_id: string | null
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
          session_id?: string | null
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
          session_id?: string | null
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
            foreignKeyName: "tickets_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_safe"
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
            foreignKeyName: "time_clock_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_safe"
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
            foreignKeyName: "time_report_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_safe"
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
      warranties: {
        Row: {
          client_id: string | null
          company_id: string
          contact_info: string | null
          coverage_details: string | null
          created_at: string
          created_by: string | null
          description: string | null
          document_url: string | null
          end_date: string
          id: string
          project_id: string | null
          provider: string | null
          start_date: string
          status: string
          title: string
          updated_at: string
          warranty_number: string
          warranty_type: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          contact_info?: string | null
          coverage_details?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date: string
          id?: string
          project_id?: string | null
          provider?: string | null
          start_date: string
          status?: string
          title: string
          updated_at?: string
          warranty_number: string
          warranty_type?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          contact_info?: string | null
          coverage_details?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_url?: string | null
          end_date?: string
          id?: string
          project_id?: string | null
          provider?: string | null
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
          warranty_number?: string
          warranty_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warranties_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          claim_date: string
          claim_number: string
          completed_at: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          resolution: string | null
          status: string
          updated_at: string
          warranty_id: string
        }
        Insert: {
          claim_date: string
          claim_number: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          resolution?: string | null
          status?: string
          updated_at?: string
          warranty_id: string
        }
        Update: {
          claim_date?: string
          claim_number?: string
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          resolution?: string | null
          status?: string
          updated_at?: string
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_cost: number | null
          actual_end: string | null
          actual_hours: number | null
          actual_start: string | null
          assigned_to: string | null
          company_id: string
          completed_by: string | null
          completed_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          location_details: string | null
          priority: string | null
          project_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          special_instructions: string | null
          status: string
          ticket_id: string | null
          title: string
          updated_at: string
          work_order_number: string
          work_type: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          assigned_to?: string | null
          company_id: string
          completed_by?: string | null
          completed_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          location_details?: string | null
          priority?: string | null
          project_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          special_instructions?: string | null
          status?: string
          ticket_id?: string | null
          title: string
          updated_at?: string
          work_order_number: string
          work_type?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          assigned_to?: string | null
          company_id?: string
          completed_by?: string | null
          completed_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          location_details?: string | null
          priority?: string | null
          project_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          special_instructions?: string | null
          status?: string
          ticket_id?: string | null
          title?: string
          updated_at?: string
          work_order_number?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agents_safe: {
        Row: {
          company_id: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          is_available: boolean | null
          is_online: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
          vehicle_info: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_available?: boolean | null
          is_online?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_info?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          is_available?: boolean | null
          is_online?: boolean | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      company_payment_settings_safe: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string | null
          is_enabled: boolean | null
          provider: string | null
          square_application_id: string | null
          square_environment: string | null
          square_location_id: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          provider?: string | null
          square_application_id?: string | null
          square_environment?: string | null
          square_location_id?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string | null
          is_enabled?: boolean | null
          provider?: string | null
          square_application_id?: string | null
          square_environment?: string | null
          square_location_id?: string | null
          updated_at?: string | null
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
      support_chats_anonymized: {
        Row: {
          assigned_agent_id: string | null
          channel: string | null
          created_at: string | null
          department: string | null
          id: string | null
          status: string | null
          topic: string | null
          updated_at: string | null
          visitor_email_domain: string | null
          visitor_name_masked: string | null
          visitor_phone_masked: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          channel?: string | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
          visitor_email_domain?: never
          visitor_name_masked?: never
          visitor_phone_masked?: never
        }
        Update: {
          assigned_agent_id?: string | null
          channel?: string | null
          created_at?: string | null
          department?: string | null
          id?: string | null
          status?: string | null
          topic?: string | null
          updated_at?: string | null
          visitor_email_domain?: never
          visitor_name_masked?: never
          visitor_phone_masked?: never
        }
        Relationships: []
      }
    }
    Functions: {
      approve_company: { Args: { _company_id: string }; Returns: boolean }
      can_insert_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_verification_codes: { Args: never; Returns: undefined }
      get_agent_locations: {
        Args: { _company_id: string }
        Returns: {
          agent_id: string
          current_location_lat: number
          current_location_lng: number
          full_name: string
          is_available: boolean
          is_online: boolean
          last_location_update: string
        }[]
      }
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
      is_company_admin:
        | { Args: { _company_id: string; _user_id: string }; Returns: boolean }
        | { Args: { company_uuid: string }; Returns: boolean }
      is_company_member:
        | { Args: { _company_id: string; _user_id: string }; Returns: boolean }
        | { Args: { company_uuid: string }; Returns: boolean }
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
      is_support_admin: { Args: { _user_id: string }; Returns: boolean }
      purge_old_deleted_items: { Args: never; Returns: undefined }
      reject_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "staff"
        | "user"
        | "client"
        | "super_admin"
        | "support_admin"
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
      app_role: [
        "admin",
        "staff",
        "user",
        "client",
        "super_admin",
        "support_admin",
      ],
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
