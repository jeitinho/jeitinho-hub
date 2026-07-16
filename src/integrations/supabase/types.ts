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
      experiences: {
        Row: {
          city: string | null
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          duration: string | null
          experience_type: string | null
          gallery: Json
          id: string
          is_published: boolean
          level: string | null
          location: string | null
          neighborhood: string | null
          partner_id: string | null
          price_from: number | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
          videos: Json
        }
        Insert: {
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration?: string | null
          experience_type?: string | null
          gallery?: Json
          id?: string
          is_published?: boolean
          level?: string | null
          location?: string | null
          neighborhood?: string | null
          partner_id?: string | null
          price_from?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          videos?: Json
        }
        Update: {
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          duration?: string | null
          experience_type?: string | null
          gallery?: Json
          id?: string
          is_published?: boolean
          level?: string | null
          location?: string | null
          neighborhood?: string | null
          partner_id?: string | null
          price_from?: number | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
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
      leads: {
        Row: {
          activities: string[]
          created_at: string
          email: string | null
          external_ref: string | null
          id: string
          message: string | null
          name: string | null
          party_size: number | null
          phone: string | null
          processed_at: string | null
          prospect_id: string | null
          raw_payload: Json
          received_at: string
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          travel_end: string | null
          travel_start: string | null
          updated_at: string
        }
        Insert: {
          activities?: string[]
          created_at?: string
          email?: string | null
          external_ref?: string | null
          id?: string
          message?: string | null
          name?: string | null
          party_size?: number | null
          phone?: string | null
          processed_at?: string | null
          prospect_id?: string | null
          raw_payload?: Json
          received_at?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
        }
        Update: {
          activities?: string[]
          created_at?: string
          email?: string | null
          external_ref?: string | null
          id?: string
          message?: string | null
          name?: string | null
          party_size?: number | null
          phone?: string | null
          processed_at?: string | null
          prospect_id?: string | null
          raw_payload?: Json
          received_at?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          travel_end?: string | null
          travel_start?: string | null
          updated_at?: string
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
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
          id: string
          message: string | null
          metadata: Json
          name: string
          notes: string | null
          owner_id: string | null
          party_size: number | null
          phone: string | null
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
          id?: string
          message?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          owner_id?: string | null
          party_size?: number | null
          phone?: string | null
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
          id?: string
          message?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          owner_id?: string | null
          party_size?: number | null
          phone?: string | null
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
          created_at: string
          currency: string
          details: Json
          icon: string | null
          id: string
          label: string
          position: number
          quantity: number
          quote_id: string
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          icon?: string | null
          id?: string
          label: string
          position?: number
          quantity?: number
          quote_id: string
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          icon?: string | null
          id?: string
          label?: string
          position?: number
          quantity?: number
          quote_id?: string
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_lines_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
          equipment: Json
          eyebrow: string | null
          id: string
          items: Json
          location: string | null
          notes: string | null
          number: string | null
          paid_at: string | null
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
          equipment?: Json
          eyebrow?: string | null
          id?: string
          items?: Json
          location?: string | null
          notes?: string | null
          number?: string | null
          paid_at?: string | null
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
          equipment?: Json
          eyebrow?: string | null
          id?: string
          items?: Json
          location?: string | null
          notes?: string | null
          number?: string | null
          paid_at?: string | null
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
      trips: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          guide_id: string | null
          hotels: Json
          id: string
          itinerary: Json
          notes: string | null
          payments: Json
          reference: string
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          transport: Json
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          guide_id?: string | null
          hotels?: Json
          id?: string
          itinerary?: Json
          notes?: string | null
          payments?: Json
          reference: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title: string
          transport?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          guide_id?: string | null
          hotels?: Json
          id?: string
          itinerary?: Json
          notes?: string | null
          payments?: Json
          reference?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
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
      [_ in never]: never
    }
    Functions: {
      can_edit_content: { Args: { _user_id: string }; Returns: boolean }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      can_review_content: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      next_quote_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "redacteur"
        | "guide"
        | "prestataire"
        | "redacteur_chef"
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
      app_role: [
        "admin",
        "manager",
        "redacteur",
        "guide",
        "prestataire",
        "redacteur_chef",
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
