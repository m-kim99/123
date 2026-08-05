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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      account_deletion_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          requested_at: string
          scheduled_deletion_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          requested_at?: string
          scheduled_deletion_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          content: string
          created_at: string | null
          hidden_at: string | null
          id: string
          is_hidden: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string | null
          hidden_at?: string | null
          id?: string
          is_hidden?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string | null
          hidden_at?: string | null
          id?: string
          is_hidden?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          allow_comments: boolean | null
          company_id: string
          content: string
          created_at: string | null
          created_by: string
          hidden_at: string | null
          id: string
          is_hidden: boolean
          title: string
          updated_at: string | null
        }
        Insert: {
          allow_comments?: boolean | null
          company_id: string
          content: string
          created_at?: string | null
          created_by: string
          hidden_at?: string | null
          id?: string
          is_hidden?: boolean
          title: string
          updated_at?: string | null
        }
        Update: {
          allow_comments?: boolean | null
          company_id?: string
          content?: string
          created_at?: string | null
          created_by?: string
          hidden_at?: string | null
          id?: string
          is_hidden?: boolean
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string
          company_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string | null
          deleted_at: string | null
          department_id: string | null
          file_path: string
          file_size: number | null
          id: string
          is_classified: boolean | null
          ocr_text: string | null
          parent_category_id: string | null
          subcategory_id: string | null
          title: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          company_id?: string | null
          deleted_at?: string | null
          department_id?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_classified?: boolean | null
          ocr_text?: string | null
          parent_category_id?: string | null
          subcategory_id?: string | null
          title: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string | null
          deleted_at?: string | null
          department_id?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_classified?: boolean | null
          ocr_text?: string | null
          parent_category_id?: string | null
          subcategory_id?: string | null
          title?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      innopay_autopay_pending: {
        Row: {
          amount: number
          bill_key: string | null
          charge_moid: string | null
          charging_at: string | null
          company_id: string
          created_at: string
          member_count: number
          moid: string
          plan_name: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          bill_key?: string | null
          charge_moid?: string | null
          charging_at?: string | null
          company_id: string
          created_at?: string
          member_count: number
          moid: string
          plan_name: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          bill_key?: string | null
          charge_moid?: string | null
          charging_at?: string | null
          company_id?: string
          created_at?: string
          member_count?: number
          moid?: string
          plan_name?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "innopay_autopay_pending_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      innopay_noti_log: {
        Row: {
          amount: number | null
          bill_key: string | null
          id: string
          moid: string | null
          pay_method: string | null
          pg_tid: string | null
          raw: Json | null
          received_at: string
          shop_code: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          bill_key?: string | null
          id?: string
          moid?: string | null
          pay_method?: string | null
          pg_tid?: string | null
          raw?: Json | null
          received_at?: string
          shop_code?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          bill_key?: string | null
          id?: string
          moid?: string | null
          pay_method?: string | null
          pg_tid?: string | null
          raw?: Json | null
          received_at?: string
          shop_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          content: string
          created_at: string | null
          email: string
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          content: string
          created_at?: string | null
          email: string
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          content?: string
          created_at?: string | null
          email?: string
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_replies: {
        Row: {
          content: string
          created_at: string | null
          id: string
          inquiry_id: string
          is_internal: boolean | null
          operator_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          inquiry_id: string
          is_internal?: boolean | null
          operator_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          inquiry_id?: string
          is_internal?: boolean | null
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_replies_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiry_replies_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_mappings: {
        Row: {
          access_count: number | null
          id: string
          last_accessed_at: string | null
          registered_at: string | null
          registered_by: string | null
          subcategory_id: string | null
          tag_id: string
        }
        Insert: {
          access_count?: number | null
          id?: string
          last_accessed_at?: string | null
          registered_at?: string | null
          registered_by?: string | null
          subcategory_id?: string | null
          tag_id: string
        }
        Update: {
          access_count?: number | null
          id?: string
          last_accessed_at?: string | null
          registered_at?: string | null
          registered_by?: string | null
          subcategory_id?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_mappings_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_tags: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          subcategory_id: string | null
          tag_data: Json | null
          tag_uid: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          subcategory_id?: string | null
          tag_data?: Json | null
          tag_uid: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          subcategory_id?: string | null
          tag_data?: Json | null
          tag_uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "nfc_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_tags_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          department_id: string | null
          document_id: string | null
          id: string
          message: string
          parent_category_id: string | null
          subcategory_id: string | null
          target_user_id: string | null
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department_id?: string | null
          document_id?: string | null
          id?: string
          message: string
          parent_category_id?: string | null
          subcategory_id?: string | null
          target_user_id?: string | null
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department_id?: string | null
          document_id?: string | null
          id?: string
          message?: string
          parent_category_id?: string | null
          subcategory_id?: string | null
          target_user_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          operator_id: string
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          operator_id: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          operator_id?: string
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operator_activity_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          is_super: boolean | null
          last_login_at: string | null
          name: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_active?: boolean | null
          is_super?: boolean | null
          last_login_at?: string | null
          name: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          is_super?: boolean | null
          last_login_at?: string | null
          name?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payapp_pending_rebills: {
        Row: {
          amount: number
          company_id: string
          created_at: string | null
          customer_key: string
          id: string
          member_count: number
          rebill_no: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string | null
          customer_key: string
          id?: string
          member_count: number
          rebill_no: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string | null
          customer_key?: string
          id?: string
          member_count?: number
          rebill_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "payapp_pending_rebills_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          cancel_amount: number
          cancel_num: string | null
          cancel_reason: string | null
          canceled_at: string | null
          card_company: string | null
          card_number: string | null
          company_id: string
          created_at: string
          currency: string
          failure_code: string | null
          failure_message: string | null
          id: string
          method: string | null
          order_id: string
          payment_key: string | null
          receipt_url: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          cancel_amount?: number
          cancel_num?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          card_company?: string | null
          card_number?: string | null
          company_id: string
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          method?: string | null
          order_id: string
          payment_key?: string | null
          receipt_url?: string | null
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          cancel_amount?: number
          cancel_num?: string | null
          cancel_reason?: string | null
          canceled_at?: string | null
          card_company?: string | null
          card_number?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          method?: string | null
          order_id?: string
          payment_key?: string | null
          receipt_url?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_requests: {
        Row: {
          company_id: string | null
          department_id: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string | null
          requested_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          department_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          department_id?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string | null
          requested_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_permission_requests_processed_by"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_permission_requests_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number
          consumed_at: string | null
          consumed_for_email: string | null
          created_at: string
          expires_at: string
          id: string
          last_sent_at: string
          otp_hash: string
          phone: string
          purpose: string
          send_count: number
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          consumed_at?: string | null
          consumed_for_email?: string | null
          created_at?: string
          expires_at: string
          id?: string
          last_sent_at?: string
          otp_hash: string
          phone: string
          purpose: string
          send_count?: number
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          consumed_at?: string | null
          consumed_for_email?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          otp_hash?: string
          phone?: string
          purpose?: string
          send_count?: number
          verified_at?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          currency: string
          display_name: string
          feature_ai_chat: boolean | null
          feature_external_share: boolean | null
          feature_nfc: boolean | null
          feature_ocr_advanced: boolean | null
          feature_statistics_advanced: boolean | null
          feature_storage_lifecycle: boolean
          id: string
          is_active: boolean
          max_ai_queries_monthly: number | null
          max_departments: number | null
          max_documents: number | null
          max_members: number | null
          max_nfc_tags: number | null
          max_storage_mb: number | null
          name: string
          price_monthly: number
          price_yearly: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name: string
          feature_ai_chat?: boolean | null
          feature_external_share?: boolean | null
          feature_nfc?: boolean | null
          feature_ocr_advanced?: boolean | null
          feature_statistics_advanced?: boolean | null
          feature_storage_lifecycle?: boolean
          id?: string
          is_active?: boolean
          max_ai_queries_monthly?: number | null
          max_departments?: number | null
          max_documents?: number | null
          max_members?: number | null
          max_nfc_tags?: number | null
          max_storage_mb?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string
          feature_ai_chat?: boolean | null
          feature_external_share?: boolean | null
          feature_nfc?: boolean | null
          feature_ocr_advanced?: boolean | null
          feature_statistics_advanced?: boolean | null
          feature_storage_lifecycle?: boolean
          id?: string
          is_active?: boolean
          max_ai_queries_monthly?: number | null
          max_departments?: number | null
          max_documents?: number | null
          max_members?: number | null
          max_nfc_tags?: number | null
          max_storage_mb?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          action_details: Json | null
          action_taken: string | null
          category: string
          created_at: string | null
          evidence_urls: string[] | null
          id: string
          priority: string | null
          reason: string
          reporter_email: string | null
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          target_company_id: string | null
          target_id: string
          target_type: string
          updated_at: string | null
        }
        Insert: {
          action_details?: Json | null
          action_taken?: string | null
          category?: string
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          priority?: string | null
          reason: string
          reporter_email?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_company_id?: string | null
          target_id: string
          target_type: string
          updated_at?: string | null
        }
        Update: {
          action_details?: Json | null
          action_taken?: string | null
          category?: string
          created_at?: string | null
          evidence_urls?: string[] | null
          id?: string
          priority?: string | null
          reason?: string
          reporter_email?: string | null
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          target_company_id?: string | null
          target_id?: string
          target_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          company_id: string | null
          id: string
          query: string
          search_count: number | null
          searched_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          id?: string
          query: string
          search_count?: number | null
          searched_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          id?: string
          query?: string
          search_count?: number | null
          searched_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_documents: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          is_active: boolean | null
          message: string | null
          permission: string
          shared_at: string | null
          shared_by_user_id: string
          shared_to_user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          permission: string
          shared_at?: string | null
          shared_by_user_id: string
          shared_to_user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          is_active?: boolean | null
          message?: string | null
          permission?: string
          shared_at?: string | null
          shared_by_user_id?: string
          shared_to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_events: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          company_id: string
          created_at: string
          department_id: string | null
          detail: string | null
          document_title: string | null
          event_type: string
          id: string
          subcategory_id: string | null
          subcategory_name: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          company_id: string
          created_at?: string
          department_id?: string | null
          detail?: string | null
          document_title?: string | null
          event_type: string
          id?: string
          subcategory_id?: string | null
          subcategory_name?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          company_id?: string
          created_at?: string
          department_id?: string | null
          detail?: string | null
          document_title?: string | null
          event_type?: string
          id?: string
          subcategory_id?: string | null
          subcategory_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_events_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          checked_out_at: string | null
          checked_out_by: string | null
          checkout_reason: string | null
          color_label: string | null
          company_id: string | null
          created_at: string | null
          default_expiry_days: number | null
          department_id: string
          description: string | null
          disposed_at: string | null
          disposed_by: string | null
          disposed_method: string | null
          expiry_date: string | null
          id: string
          management_number: string | null
          name: string
          nfc_registered: boolean | null
          nfc_tag_id: string | null
          parent_category_id: string
          storage_location: string | null
          storage_status: string
        }
        Insert: {
          checked_out_at?: string | null
          checked_out_by?: string | null
          checkout_reason?: string | null
          color_label?: string | null
          company_id?: string | null
          created_at?: string | null
          default_expiry_days?: number | null
          department_id: string
          description?: string | null
          disposed_at?: string | null
          disposed_by?: string | null
          disposed_method?: string | null
          expiry_date?: string | null
          id?: string
          management_number?: string | null
          name: string
          nfc_registered?: boolean | null
          nfc_tag_id?: string | null
          parent_category_id: string
          storage_location?: string | null
          storage_status?: string
        }
        Update: {
          checked_out_at?: string | null
          checked_out_by?: string | null
          checkout_reason?: string | null
          color_label?: string | null
          company_id?: string | null
          created_at?: string | null
          default_expiry_days?: number | null
          department_id?: string
          description?: string | null
          disposed_at?: string | null
          disposed_by?: string | null
          disposed_method?: string | null
          expiry_date?: string | null
          id?: string
          management_number?: string | null
          name?: string
          nfc_registered?: boolean | null
          nfc_tag_id?: string | null
          parent_category_id?: string
          storage_location?: string | null
          storage_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategories_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subcategories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          billing_cycle: string
          billing_key: string | null
          canceled_at: string | null
          card_company: string | null
          card_number: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_renewal_attempt_at: string | null
          member_count: number | null
          monthly_amount: number | null
          payment_customer_id: string | null
          payment_provider: string | null
          payment_subscription_id: string | null
          plan_id: string
          renewal_attempts: number
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          billing_cycle?: string
          billing_key?: string | null
          canceled_at?: string | null
          card_company?: string | null
          card_number?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_renewal_attempt_at?: string | null
          member_count?: number | null
          monthly_amount?: number | null
          payment_customer_id?: string | null
          payment_provider?: string | null
          payment_subscription_id?: string | null
          plan_id: string
          renewal_attempts?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          billing_cycle?: string
          billing_key?: string | null
          canceled_at?: string | null
          card_company?: string | null
          card_number?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_renewal_attempt_at?: string | null
          member_count?: number | null
          monthly_amount?: number | null
          payment_customer_id?: string | null
          payment_provider?: string | null
          payment_subscription_id?: string | null
          plan_id?: string
          renewal_attempts?: number
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_notices: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          display_location: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_pinned: boolean | null
          published_at: string | null
          target_audience: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          display_location?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          target_audience?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          display_location?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_pinned?: boolean | null
          published_at?: string | null
          target_audience?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_tracking: {
        Row: {
          ai_queries_used: number
          company_id: string
          created_at: string
          id: string
          period_start: string
          updated_at: string
        }
        Insert: {
          ai_queries_used?: number
          company_id: string
          created_at?: string
          id?: string
          period_start: string
          updated_at?: string
        }
        Update: {
          ai_queries_used?: number
          company_id?: string
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_tracking_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_device_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          subcategory_id: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          subcategory_id: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          subcategory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_favorites_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_muted_categories: {
        Row: {
          id: string
          muted_at: string | null
          parent_category_id: string
          user_id: string
        }
        Insert: {
          id?: string
          muted_at?: string | null
          parent_category_id: string
          user_id: string
        }
        Update: {
          id?: string
          muted_at?: string | null
          parent_category_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_muted_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          category_changes: boolean | null
          company_id: string
          created_at: string | null
          document_created: boolean | null
          document_deleted: boolean | null
          document_shared: boolean | null
          expiry_alerts: boolean | null
          id: string
          notify_my_department_only: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_changes?: boolean | null
          company_id: string
          created_at?: string | null
          document_created?: boolean | null
          document_deleted?: boolean | null
          document_shared?: boolean | null
          expiry_alerts?: boolean | null
          id?: string
          notify_my_department_only?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_changes?: boolean | null
          company_id?: string
          created_at?: string | null
          document_created?: boolean | null
          document_deleted?: boolean | null
          document_shared?: boolean | null
          expiry_alerts?: boolean | null
          id?: string
          notify_my_department_only?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_status: {
        Row: {
          created_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          notification_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          notification_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          notification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_status_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          company_id: string | null
          created_at: string | null
          department_id: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_permissions_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_recent_visits: {
        Row: {
          company_id: string | null
          department_id: string | null
          id: string
          parent_category_id: string | null
          subcategory_id: string
          user_id: string
          visit_count: number | null
          visited_at: string | null
        }
        Insert: {
          company_id?: string | null
          department_id?: string | null
          id?: string
          parent_category_id?: string | null
          subcategory_id: string
          user_id: string
          visit_count?: number | null
          visited_at?: string | null
        }
        Update: {
          company_id?: string | null
          department_id?: string | null
          id?: string
          parent_category_id?: string | null
          subcategory_id?: string
          user_id?: string
          visit_count?: number | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_recent_visits_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_visits_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_visits_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_visits_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recent_visits_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_suspensions: {
        Row: {
          expires_at: string | null
          id: string
          lifted_at: string | null
          lifted_by: string | null
          reason: string
          suspended_at: string | null
          suspended_by: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason: string
          suspended_at?: string | null
          suspended_by: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          lifted_at?: string | null
          lifted_by?: string | null
          reason?: string
          suspended_at?: string | null
          suspended_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_suspensions_lifted_by_fkey"
            columns: ["lifted_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_suspensions_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          company_id: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          id: string
          last_login_at: string | null
          name: string | null
          preferences: Json | null
          push_id: string | null
          role: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id: string
          last_login_at?: string | null
          name?: string | null
          preferences?: Json | null
          push_id?: string | null
          role?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          last_login_at?: string | null
          name?: string | null
          preferences?: Json | null
          push_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_departments"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      operator_dashboard_stats: {
        Row: {
          active_suspensions: number | null
          new_users_30d: number | null
          new_users_7d: number | null
          open_inquiries: number | null
          pending_reports: number | null
          total_companies: number | null
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_company_id: { Args: never; Returns: string }
      check_user_suspension: {
        Args: { check_user_id: string }
        Returns: {
          expires_at: string
          is_suspended: boolean
          reason: string
          suspension_id: string
        }[]
      }
      company_has_storage_lifecycle: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      get_company_storage_limit_mb: {
        Args: { p_company_id: string }
        Returns: number
      }
      get_company_storage_usage: {
        Args: { p_company_id: string }
        Returns: number
      }
      increment_ai_query_usage: {
        Args: { p_company_id: string }
        Returns: number
      }
      is_operator: { Args: never; Returns: boolean }
      is_super_operator: { Args: never; Returns: boolean }
      operator_resolve_report: {
        Args: { p_action: string; p_note?: string; p_report_id: string }
        Returns: Json
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
