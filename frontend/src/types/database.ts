export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          id: string
          contact_id: string
          message: string
          is_outgoing: boolean
          timestamp: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          message: string
          is_outgoing: boolean
          timestamp: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          message?: string
          is_outgoing?: boolean
          timestamp?: string
          read?: boolean
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          name: string | null
          number: string
          is_my_contact: boolean
          is_from_csv: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          number: string
          is_my_contact?: boolean
          is_from_csv?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          number?: string
          is_my_contact?: boolean
          is_from_csv?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      broadcasts: {
        Row: {
          id: string
          message: string
          total_contacts: number
          successful: number
          failed: number
          status: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          message: string
          total_contacts: number
          successful?: number
          failed?: number
          status?: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          message?: string
          total_contacts?: number
          successful?: number
          failed?: number
          status?: string
          created_at?: string
          completed_at?: string | null
        }
      }
      scheduled_messages: {
        Row: {
          id: string
          message: string
          contacts: string[]
          scheduled_at: string
          is_recurring: boolean
          recurring_interval: string | null
          recurring_end_date: string | null
          status: string
          sent_at: string | null
          successful: number
          failed: number
          created_at: string
        }
        Insert: {
          id?: string
          message: string
          contacts: string[]
          scheduled_at: string
          is_recurring?: boolean
          recurring_interval?: string | null
          recurring_end_date?: string | null
          status?: string
          sent_at?: string | null
          successful?: number
          failed?: number
          created_at?: string
        }
        Update: {
          id?: string
          message?: string
          contacts?: string[]
          scheduled_at?: string
          is_recurring?: boolean
          recurring_interval?: string | null
          recurring_end_date?: string | null
          status?: string
          sent_at?: string | null
          successful?: number
          failed?: number
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          activity_type: string
          description: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          activity_type: string
          description: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          activity_type?: string
          description?: string
          metadata?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
