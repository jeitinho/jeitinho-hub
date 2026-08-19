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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acquisition_events: {
        Row: {
          campaign: string | null
          client_id: string | null
          content: string | null
          currency: string | null
          event_name: string
          id: string
          landing_path: string | null
          lead_id: string | null
          medium: string | null
          metadata: Json
          occurred_at: string
          prospect_id: string | null
          referrer: string | null
          source: string | null
          term: string | null
          value: number | null
        }
        Insert: {
          campaign?: string | null
          client_id?: string | null
          content?: string | null
          currency?: string | null
          event_name: string
          id?: string
          landing_path?: string | null
          lead_id?: string | null
          medium?: string | null
          metadata?: Json
          occurred_at?: string
          prospect_id?: string | null
          referrer?: string | null
          source?: string | null
          term?: string | null
          value?: number | null
        }
        Update: {
          campaign?: string | null
          client_id?: string | null
          content?: string | null
          currency?: string | null
          event_name?: string
          id?: string
          landing_path?: string | null
          lead_id?: string | null
          medium?: string | null
          metadata?: Json
          occurred_at?: string
          prospect_id?: string | null
          referrer?: string | null
          source?: string | null
          term?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisition_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acquisition_events_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_actions: {
        Row: {
          agent_id: string
          agent_run_id: string
          approval_required: boolean
          approved_by: string | null
          created_at: string
          error: string | null
          executed_at: string | null
          id: string
          input: Json | null
          output: Json | null
          risk: string
          status: string
          tool: string
        }
        Insert: {
          agent_id: string
          agent_run_id: string
          approval_required?: boolean
          approved_by?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          risk?: string
          status?: string
          tool: string
        }
        Update: {
          agent_id?: string
          agent_run_id?: string
          approval_required?: boolean
          approved_by?: string | null
          created_at?: string
          error?: string | null
          executed_at?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          risk?: string
          status?: string
          tool?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_agent_run_id_fkey"
            columns: ["agent_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          approval_required: boolean
          approved_by: string | null
          autonomy: string
          completed_at: string | null
          confidence: number | null
          created_at: string
          error: string | null
          id: string
          input_summary: string | null
          output_summary: string | null
          status: string
          target_id: string | null
          target_type: string | null
          task: string
        }
        Insert: {
          agent_id: string
          approval_required?: boolean
          approved_by?: string | null
          autonomy: string
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input_summary?: string | null
          output_summary?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          task: string
        }
        Update: {
          agent_id?: string
          approval_required?: boolean
          approved_by?: string | null
          autonomy?: string
          completed_at?: string | null
          confidence?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input_summary?: string | null
          output_summary?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          task?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_active: boolean
          language: string | null
          location: string | null
          long_bio: string | null
          name: string
          photo_url: string | null
          role: string | null
          slug: string
          social: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string | null
          location?: string | null
          long_bio?: string | null
          name: string
          photo_url?: string | null
          role?: string | null
          slug: string
          social?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string | null
          location?: string | null
          long_bio?: string | null
          name?: string
          photo_url?: string | null
          role?: string | null
          slug?: string
          social?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          location: string | null
          related_content_id: string | null
          related_trip_id: string | null
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          related_content_id?: string | null
          related_trip_id?: string | null
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          location?: string | null
          related_content_id?: string | null
          related_trip_id?: string | null
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_trip_id_fkey"
            columns: ["related_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["channel_kind"]
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["channel_kind"]
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["channel_kind"]
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_contact_at: string | null
          notes: string | null
          phone: string | null
          source: string | null
          stage: string
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_contact_at?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      content_categories: {
        Row: {
          created_at: string
          description: string | null
          faq: Json
          id: string
          intro: string | null
          name: string
          parent_id: string | null
          scope: string[]
          slug: string
          sort_order: number
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          faq?: Json
          id?: string
          intro?: string | null
          name: string
          parent_id?: string | null
          scope?: string[]
          slug: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          faq?: Json
          id?: string
          intro?: string | null
          name?: string
          parent_id?: string | null
          scope?: string[]
          slug?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          author_id: string
          body: string
          content_id: string
          created_at: string
          id: string
          mentions: string[]
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          selection: Json | null
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          content_id: string
          created_at?: string
          id?: string
          mentions?: string[]
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection?: Json | null
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          mentions?: string[]
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection?: Json | null
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      content_media: {
        Row: {
          alt: string | null
          caption: string | null
          content_id: string
          created_at: string
          id: string
          media_id: string
          metadata: Json
          position: number
          role: string
        }
        Insert: {
          alt?: string | null
          caption?: string | null
          content_id: string
          created_at?: string
          id?: string
          media_id: string
          metadata?: Json
          position?: number
          role?: string
        }
        Update: {
          alt?: string | null
          caption?: string | null
          content_id?: string
          created_at?: string
          id?: string
          media_id?: string
          metadata?: Json
          position?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_media_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      content_revisions: {
        Row: {
          content_id: string
          created_at: string
          editor_id: string | null
          from_status:
            | Database["public"]["Enums"]["content_workflow_status"]
            | null
          id: string
          note: string | null
          snapshot: Json | null
          to_status:
            | Database["public"]["Enums"]["content_workflow_status"]
            | null
        }
        Insert: {
          content_id: string
          created_at?: string
          editor_id?: string | null
          from_status?:
            | Database["public"]["Enums"]["content_workflow_status"]
            | null
          id?: string
          note?: string | null
          snapshot?: Json | null
          to_status?:
            | Database["public"]["Enums"]["content_workflow_status"]
            | null
        }
        Update: {
          content_id?: string
          created_at?: string
          editor_id?: string | null
          from_status?:
            | Database["public"]["Enums"]["content_workflow_status"]
            | null
          id?: string
          note?: string | null
          snapshot?: Json | null
          to_status?:
            | Database["public"]["Enums"]["content_workflow_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          assignee_id: string | null
          author_id: string | null
          body_json: Json
          body_markdown: string | null
          body_sections: Json
          canonical_url: string | null
          category_id: string | null
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          excerpt: string | null
          experience_id: string | null
          hashtags: string[]
          id: string
          language: string
          metadata: Json
          og_image_media_id: string | null
          parent_content_id: string | null
          published_at: string | null
          raw_caption: string | null
          reading_time_min: number | null
          scheduled_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          status: Database["public"]["Enums"]["content_workflow_status"]
          subtitle: string | null
          tags: string[]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          author_id?: string | null
          body_json?: Json
          body_markdown?: string | null
          body_sections?: Json
          canonical_url?: string | null
          category_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          experience_id?: string | null
          hashtags?: string[]
          id?: string
          language?: string
          metadata?: Json
          og_image_media_id?: string | null
          parent_content_id?: string | null
          published_at?: string | null
          raw_caption?: string | null
          reading_time_min?: number | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_workflow_status"]
          subtitle?: string | null
          tags?: string[]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          author_id?: string | null
          body_json?: Json
          body_markdown?: string | null
          body_sections?: Json
          canonical_url?: string | null
          category_id?: string | null
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          excerpt?: string | null
          experience_id?: string | null
          hashtags?: string[]
          id?: string
          language?: string
          metadata?: Json
          og_image_media_id?: string | null
          parent_content_id?: string | null
          published_at?: string | null
          raw_caption?: string | null
          reading_time_min?: number | null
          scheduled_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["content_workflow_status"]
          subtitle?: string | null
          tags?: string[]
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_og_image_media_id_fkey"
            columns: ["og_image_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contents_parent_content_id_fkey"
            columns: ["parent_content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          channel: string
          client_id: string | null
          created_at: string
          created_by: string | null
          due_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          kind: string
          lead_id: string | null
          message_draft: string | null
          prospect_id: string | null
          quote_id: string | null
          stage: number | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          channel?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          message_draft?: string | null
          prospect_id?: string | null
          quote_id?: string | null
          stage?: number | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          channel?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind?: string
          lead_id?: string | null
          message_draft?: string | null
          prospect_id?: string | null
          quote_id?: string | null
          stage?: number | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          category: string | null
          city: string | null
          commission_basis: string
          commission_pct: number | null
          conditions: Json
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration: string | null
          exclusions: Json
          experience_type: string | null
          factory_data: Json
          factory_status: string
          faq: Json
          fixed_cost: number | null
          gallery: Json
          id: string
          inclusions: Json
          is_excursion: boolean
          is_published: boolean
          level: string | null
          location: string | null
          max_group_size: number | null
          min_age: number | null
          neighborhood: string | null
          partner_id: string | null
          price_from: number | null
          price_model: string
          requires_driver: boolean
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          source_slug: string | null
          supplier_cost: number | null
          supplier_net: number | null
          tags: string[]
          title: string
          updated_at: string
          videos: Json
        }
        Insert: {
          category?: string | null
          city?: string | null
          commission_basis?: string
          commission_pct?: number | null
          conditions?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration?: string | null
          exclusions?: Json
          experience_type?: string | null
          factory_data?: Json
          factory_status?: string
          faq?: Json
          fixed_cost?: number | null
          gallery?: Json
          id?: string
          inclusions?: Json
          is_excursion?: boolean
          is_published?: boolean
          level?: string | null
          location?: string | null
          max_group_size?: number | null
          min_age?: number | null
          neighborhood?: string | null
          partner_id?: string | null
          price_from?: number | null
          price_model?: string
          requires_driver?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          source_slug?: string | null
          supplier_cost?: number | null
          supplier_net?: number | null
          tags?: string[]
          title: string
          updated_at?: string
          videos?: Json
        }
        Update: {
          category?: string | null
          city?: string | null
          commission_basis?: string
          commission_pct?: number | null
          conditions?: Json
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration?: string | null
          exclusions?: Json
          experience_type?: string | null
          factory_data?: Json
          factory_status?: string
          faq?: Json
          fixed_cost?: number | null
          gallery?: Json
          id?: string
          inclusions?: Json
          is_excursion?: boolean
          is_published?: boolean
          level?: string | null
          location?: string | null
          max_group_size?: number | null
          min_age?: number | null
          neighborhood?: string | null
          partner_id?: string | null
          price_from?: number | null
          price_model?: string
          requires_driver?: boolean
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          source_slug?: string | null
          supplier_cost?: number | null
          supplier_net?: number | null
          tags?: string[]
          title?: string
          updated_at?: string
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "experiences_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_outputs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          content: Json
          created_at: string
          experience_id: string | null
          id: string
          output_type: string
          service_id: string | null
          source_snapshot: Json
          status: string
          ticket_offer_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          experience_id?: string | null
          id?: string
          output_type: string
          service_id?: string | null
          source_snapshot?: Json
          status?: string
          ticket_offer_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          content?: Json
          created_at?: string
          experience_id?: string | null
          id?: string
          output_type?: string
          service_id?: string | null
          source_snapshot?: Json
          status?: string
          ticket_offer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_outputs_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_outputs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_outputs_ticket_offer_id_fkey"
            columns: ["ticket_offer_id"]
            isOneToOne: false
            referencedRelation: "ticket_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          activities: string[]
          assigned_to: string | null
          campaign: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          external_ref: string | null
          id: string
          last_contact_at: string | null
          message: string | null
          name: string | null
          next_action: string | null
          next_action_at: string | null
          party_size: number | null
          phone: string | null
          pipeline_stage: string
          priority: string
          processed_at: string | null
          prospect_id: string | null
          raw_payload: Json
          received_at: string
          request_type: string | null
          score: number
          score_breakdown: Json
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          travel_end: string | null
          travel_start: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          activities?: string[]
          assigned_to?: string | null
          campaign?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          external_ref?: string | null
          id?: string
          last_contact_at?: string | null
          message?: string | null
          name?: string | null
          next_action?: string | null
          next_action_at?: string | null
          party_size?: number | null
          phone?: string | null
          pipeline_stage?: string
          priority?: string
          processed_at?: string | null
          prospect_id?: string | null
          raw_payload?: Json
          received_at?: string
          request_type?: string | null
          score?: number
          score_breakdown?: Json
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          activities?: string[]
          assigned_to?: string | null
          campaign?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          external_ref?: string | null
          id?: string
          last_contact_at?: string | null
          message?: string | null
          name?: string | null
          next_action?: string | null
          next_action_at?: string | null
          party_size?: number | null
          phone?: string | null
          pipeline_stage?: string
          priority?: string
          processed_at?: string | null
          prospect_id?: string | null
          raw_payload?: Json
          received_at?: string
          request_type?: string | null
          score?: number
          score_breakdown?: Json
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt: string | null
          caption: string | null
          copyright: string | null
          created_at: string
          drive_url: string | null
          file_name: string
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          orientation: string | null
          photographer: string | null
          size_bytes: number | null
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_by: string | null
          url: string
          used_count: number
          width: number | null
        }
        Insert: {
          alt?: string | null
          caption?: string | null
          copyright?: string | null
          created_at?: string
          drive_url?: string | null
          file_name: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          orientation?: string | null
          photographer?: string | null
          size_bytes?: number | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          url: string
          used_count?: number
          width?: number | null
        }
        Update: {
          alt?: string | null
          caption?: string | null
          copyright?: string | null
          created_at?: string
          drive_url?: string | null
          file_name?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          orientation?: string | null
          photographer?: string | null
          size_bytes?: number | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          used_count?: number
          width?: number | null
        }
        Relationships: []
      }
      partner_offerings: {
        Row: {
          availability_notes: string | null
          commission_basis: string
          commission_pct: number | null
          created_at: string
          currency: string
          experience_id: string | null
          fixed_cost: number | null
          id: string
          is_active: boolean
          metadata: Json
          partner_id: string
          pricing_model: string
          priority: number
          service_id: string | null
          supplier_net: number | null
          ticket_offer_id: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          availability_notes?: string | null
          commission_basis?: string
          commission_pct?: number | null
          created_at?: string
          currency?: string
          experience_id?: string | null
          fixed_cost?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          partner_id: string
          pricing_model?: string
          priority?: number
          service_id?: string | null
          supplier_net?: number | null
          ticket_offer_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          availability_notes?: string | null
          commission_basis?: string
          commission_pct?: number | null
          created_at?: string
          currency?: string
          experience_id?: string | null
          fixed_cost?: number | null
          id?: string
          is_active?: boolean
          metadata?: Json
          partner_id?: string
          pricing_model?: string
          priority?: number
          service_id?: string | null
          supplier_net?: number | null
          ticket_offer_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_offerings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_offerings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_offerings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_offerings_ticket_offer_id_fkey"
            columns: ["ticket_offer_id"]
            isOneToOne: false
            referencedRelation: "ticket_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          category: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          category?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string
          due_at: string | null
          external_reference: string | null
          id: string
          kind: string
          metadata: Json
          notes: string | null
          paid_at: string | null
          provider: string | null
          quote_id: string | null
          status: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          due_at?: string | null
          external_reference?: string | null
          id?: string
          kind?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          provider?: string | null
          quote_id?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          due_at?: string | null
          external_reference?: string | null
          id?: string
          kind?: string
          metadata?: Json
          notes?: string | null
          paid_at?: string | null
          provider?: string | null
          quote_id?: string | null
          status?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          activities: string[]
          client_id: string | null
          created_at: string
          created_by: string | null
          email: string | null
          estimated_value: number | null
          id: string
          last_contact_at: string | null
          message: string | null
          metadata: Json
          name: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          owner_id: string | null
          party_size: number | null
          phone: string | null
          pipeline_stage: string
          priority: string
          score: number
          source: string
          status: Database["public"]["Enums"]["prospect_status"]
          travel_end: string | null
          travel_start: string | null
          updated_at: string
        }
        Insert: {
          activities?: string[]
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          message?: string | null
          metadata?: Json
          name: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string | null
          party_size?: number | null
          phone?: string | null
          pipeline_stage?: string
          priority?: string
          score?: number
          source?: string
          status?: Database["public"]["Enums"]["prospect_status"]
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Update: {
          activities?: string[]
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          estimated_value?: number | null
          id?: string
          last_contact_at?: string | null
          message?: string | null
          metadata?: Json
          name?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          owner_id?: string | null
          party_size?: number | null
          phone?: string | null
          pipeline_stage?: string
          priority?: string
          score?: number
          source?: string
          status?: Database["public"]["Enums"]["prospect_status"]
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          channel_id: string
          content_id: string
          created_at: string
          error: string | null
          external_ref: string | null
          external_url: string | null
          id: string
          payload: Json
          published_at: string | null
          published_by: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["publication_status"]
          updated_at: string
        }
        Insert: {
          channel_id: string
          content_id: string
          created_at?: string
          error?: string | null
          external_ref?: string | null
          external_url?: string | null
          id?: string
          payload?: Json
          published_at?: string | null
          published_by?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Update: {
          channel_id?: string
          content_id?: string
          created_at?: string
          error?: string | null
          external_ref?: string | null
          external_url?: string | null
          id?: string
          payload?: Json
          published_at?: string | null
          published_by?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["publication_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_lines: {
        Row: {
          amount: number | null
          commission_amount: number | null
          created_at: string
          currency: string
          details: Json
          experience_id: string | null
          icon: string | null
          id: string
          label: string
          margin_amount: number | null
          metadata: Json
          partner_id: string | null
          position: number
          quantity: number
          quote_id: string
          service_id: string | null
          supplier_cost: number | null
          ticket_offer_id: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          commission_amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          experience_id?: string | null
          icon?: string | null
          id?: string
          label: string
          margin_amount?: number | null
          metadata?: Json
          partner_id?: string | null
          position?: number
          quantity?: number
          quote_id: string
          service_id?: string | null
          supplier_cost?: number | null
          ticket_offer_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          commission_amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          experience_id?: string | null
          icon?: string | null
          id?: string
          label?: string
          margin_amount?: number | null
          metadata?: Json
          partner_id?: string | null
          position?: number
          quantity?: number
          quote_id?: string
          service_id?: string | null
          supplier_cost?: number | null
          ticket_offer_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_lines_ticket_offer_id_fkey"
            columns: ["ticket_offer_id"]
            isOneToOne: false
            referencedRelation: "ticket_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_number_sequences: {
        Row: {
          next_number: number
          updated_at: string
          year: number
        }
        Insert: {
          next_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          next_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      quotes: {
        Row: {
          accepted_at: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deposit_pct: number
          description: string | null
          equipment: Json
          eyebrow: string | null
          followup_anchor_at: string | null
          followup_paused: boolean
          followup_stage: number
          highlights: Json
          id: string
          items: Json
          itinerary: Json
          last_contact_at: string | null
          location: string | null
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          number: string | null
          paid_at: string | null
          party_size: number | null
          period_end: string | null
          period_start: string | null
          project_label: string | null
          prospect_id: string | null
          reference: string
          sent_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          title: string
          total_amount: number
          updated_at: string
          valid_until: string | null
          validity_days: number
        }
        Insert: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_pct?: number
          description?: string | null
          equipment?: Json
          eyebrow?: string | null
          followup_anchor_at?: string | null
          followup_paused?: boolean
          followup_stage?: number
          highlights?: Json
          id?: string
          items?: Json
          itinerary?: Json
          last_contact_at?: string | null
          location?: string | null
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          number?: string | null
          paid_at?: string | null
          party_size?: number | null
          period_end?: string | null
          period_start?: string | null
          project_label?: string | null
          prospect_id?: string | null
          reference: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          title: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          validity_days?: number
        }
        Update: {
          accepted_at?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit_pct?: number
          description?: string | null
          equipment?: Json
          eyebrow?: string | null
          followup_anchor_at?: string | null
          followup_paused?: boolean
          followup_stage?: number
          highlights?: Json
          id?: string
          items?: Json
          itinerary?: Json
          last_contact_at?: string | null
          location?: string | null
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          number?: string | null
          paid_at?: string | null
          party_size?: number | null
          period_end?: string | null
          period_start?: string | null
          project_label?: string | null
          prospect_id?: string | null
          reference?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          title?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          bookable: boolean
          category: string | null
          commission_basis: string
          commission_pct: number
          created_at: string
          currency: string
          description: string | null
          fixed_cost: number | null
          group_slug: string | null
          id: string
          is_published: boolean
          metadata: Json
          partner_id: string | null
          price_from: number | null
          price_label: string | null
          price_model: string
          requires_driver: boolean
          slug: string
          supplier_cost: number | null
          supplier_net: number | null
          title: string
          updated_at: string
        }
        Insert: {
          bookable?: boolean
          category?: string | null
          commission_basis?: string
          commission_pct?: number
          created_at?: string
          currency?: string
          description?: string | null
          fixed_cost?: number | null
          group_slug?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          partner_id?: string | null
          price_from?: number | null
          price_label?: string | null
          price_model?: string
          requires_driver?: boolean
          slug: string
          supplier_cost?: number | null
          supplier_net?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          bookable?: boolean
          category?: string | null
          commission_basis?: string
          commission_pct?: number
          created_at?: string
          currency?: string
          description?: string | null
          fixed_cost?: number | null
          group_slug?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          partner_id?: string | null
          price_from?: number | null
          price_label?: string | null
          price_model?: string
          requires_driver?: boolean
          slug?: string
          supplier_cost?: number | null
          supplier_net?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_directory: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      ticket_offers: {
        Row: {
          category: string | null
          commission_basis: string
          commission_pct: number | null
          created_at: string
          currency: string
          description: string | null
          event_date: string | null
          event_time: string | null
          fixed_cost: number | null
          id: string
          is_published: boolean
          metadata: Json
          notes: string | null
          pricing_model: string
          public_price: number | null
          slug: string
          supplier_cost: number | null
          supplier_net: number | null
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          category?: string | null
          commission_basis?: string
          commission_pct?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          fixed_cost?: number | null
          id?: string
          is_published?: boolean
          metadata?: Json
          notes?: string | null
          pricing_model?: string
          public_price?: number | null
          slug: string
          supplier_cost?: number | null
          supplier_net?: number | null
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category?: string | null
          commission_basis?: string
          commission_pct?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_date?: string | null
          event_time?: string | null
          fixed_cost?: number | null
          id?: string
          is_published?: boolean
          metadata?: Json
          notes?: string | null
          pricing_model?: string
          public_price?: number | null
          slug?: string
          supplier_cost?: number | null
          supplier_net?: number | null
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      trip_activities: {
        Row: {
          activity_type: string
          client_informed_at: string | null
          commission_amount: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          experience_id: string | null
          id: string
          margin_amount: number
          metadata: Json
          notes: string | null
          partner_id: string | null
          partner_reference: string | null
          quantity: number
          quote_line_id: string | null
          replaced_activity_id: string | null
          sale_price: number
          scheduled_end: string | null
          scheduled_start: string | null
          service_id: string | null
          status: string
          supplier_cost: number
          ticket_offer_id: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          client_informed_at?: string | null
          commission_amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          experience_id?: string | null
          id?: string
          margin_amount?: number
          metadata?: Json
          notes?: string | null
          partner_id?: string | null
          partner_reference?: string | null
          quantity?: number
          quote_line_id?: string | null
          replaced_activity_id?: string | null
          sale_price?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string | null
          status?: string
          supplier_cost?: number
          ticket_offer_id?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          client_informed_at?: string | null
          commission_amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          experience_id?: string | null
          id?: string
          margin_amount?: number
          metadata?: Json
          notes?: string | null
          partner_id?: string | null
          partner_reference?: string | null
          quantity?: number
          quote_line_id?: string | null
          replaced_activity_id?: string | null
          sale_price?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string | null
          status?: string
          supplier_cost?: number
          ticket_offer_id?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_activities_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_activities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_activities_quote_line_id_fkey"
            columns: ["quote_line_id"]
            isOneToOne: false
            referencedRelation: "quote_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_activities_replaced_activity_id_fkey"
            columns: ["replaced_activity_id"]
            isOneToOne: false
            referencedRelation: "trip_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_activities_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_activities_ticket_offer_id_fkey"
            columns: ["ticket_offer_id"]
            isOneToOne: false
            referencedRelation: "ticket_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_activities_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_number_sequences: {
        Row: {
          next_number: number
          updated_at: string
          year: number
        }
        Insert: {
          next_number?: number
          updated_at?: string
          year: number
        }
        Update: {
          next_number?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      trip_travelers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_travelers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          end_date: string | null
          guide_id: string | null
          hotels: Json
          id: string
          itinerary: Json
          margin_amount: number | null
          metadata: Json
          notes: string | null
          notes_internal: string | null
          party_size: number | null
          payments: Json
          quote_id: string | null
          quoted_amount: number | null
          reference: string
          source: string
          source_prospect_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          supplier_cost: number | null
          title: string
          transport: Json
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          guide_id?: string | null
          hotels?: Json
          id?: string
          itinerary?: Json
          margin_amount?: number | null
          metadata?: Json
          notes?: string | null
          notes_internal?: string | null
          party_size?: number | null
          payments?: Json
          quote_id?: string | null
          quoted_amount?: number | null
          reference: string
          source?: string
          source_prospect_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          supplier_cost?: number | null
          title: string
          transport?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          end_date?: string | null
          guide_id?: string | null
          hotels?: Json
          id?: string
          itinerary?: Json
          margin_amount?: number | null
          metadata?: Json
          notes?: string | null
          notes_internal?: string | null
          party_size?: number | null
          payments?: Json
          quote_id?: string | null
          quoted_amount?: number | null
          reference?: string
          source?: string
          source_prospect_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          supplier_cost?: number | null
          title?: string
          transport?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_source_prospect_id_fkey"
            columns: ["source_prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      catalog_items: {
        Row: {
          currency: string | null
          id: string | null
          is_published: boolean | null
          item_type: string | null
          public_price: number | null
          slug: string | null
          title: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit_content: { Args: { _user_id: string }; Returns: boolean }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      can_review_content: { Args: { _user_id: string }; Returns: boolean }
      convert_accepted_quote_to_trip: {
        Args: { p_quote_id: string }
        Returns: string
      }
      convert_prospect_to_client: {
        Args: { p_prospect_id: string }
        Returns: string
      }
      copy_quote_lines_to_trip: {
        Args: { p_quote_id: string; p_trip_id: string }
        Returns: undefined
      }
      create_trip_from_accepted_quote: {
        Args: { p_quote_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      next_quote_number: { Args: never; Returns: string }
      next_trip_reference: { Args: never; Returns: string }
    }
    Enums: {
      account_status: "pending_validation" | "active" | "rejected"
      app_role:
        | "admin"
        | "manager"
        | "redacteur"
        | "guide"
        | "prestataire"
        | "redacteur_chef"
        | "auteur"
      channel_kind:
        | "blog_github"
        | "website"
        | "instagram"
        | "tiktok"
        | "pinterest"
        | "newsletter"
        | "whatsapp"
        | "guide_pdf"
        | "landing"
      comment_status: "open" | "resolved"
      content_type:
        | "blog"
        | "guide"
        | "landing"
        | "seo_hub"
        | "instagram_reel"
        | "instagram_carousel"
        | "instagram_story"
        | "tiktok"
        | "pinterest"
        | "newsletter"
      content_workflow_status:
        | "draft"
        | "writing"
        | "to_review"
        | "changes_requested"
        | "approved"
        | "ready_to_publish"
        | "scheduled"
        | "published"
        | "archived"
        | "deleted"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "converted"
        | "lost"
        | "spam"
      prospect_status:
        | "new"
        | "contacted"
        | "quoted"
        | "negotiating"
        | "won"
        | "lost"
      publication_status: "pending" | "in_progress" | "success" | "failed"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "refused"
        | "paid"
        | "ready"
        | "expired"
      trip_status:
        | "draft"
        | "confirmed"
        | "in_progress"
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
      account_status: ["pending_validation", "active", "rejected"],
      app_role: [
        "admin",
        "manager",
        "redacteur",
        "guide",
        "prestataire",
        "redacteur_chef",
        "auteur",
      ],
      channel_kind: [
        "blog_github",
        "website",
        "instagram",
        "tiktok",
        "pinterest",
        "newsletter",
        "whatsapp",
        "guide_pdf",
        "landing",
      ],
      comment_status: ["open", "resolved"],
      content_type: [
        "blog",
        "guide",
        "landing",
        "seo_hub",
        "instagram_reel",
        "instagram_carousel",
        "instagram_story",
        "tiktok",
        "pinterest",
        "newsletter",
      ],
      content_workflow_status: [
        "draft",
        "writing",
        "to_review",
        "changes_requested",
        "approved",
        "ready_to_publish",
        "scheduled",
        "published",
        "archived",
        "deleted",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "converted",
        "lost",
        "spam",
      ],
      prospect_status: [
        "new",
        "contacted",
        "quoted",
        "negotiating",
        "won",
        "lost",
      ],
      publication_status: ["pending", "in_progress", "success", "failed"],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "refused",
        "paid",
        "ready",
        "expired",
      ],
      trip_status: [
        "draft",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
