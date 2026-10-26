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
      access_codes: {
        Row: {
          access_count: number
          code_hash: string
          created_at: string
          expires_at: string | null
          id: string
          label: string | null
          last_access_at: string | null
          status: string
          type: string
        }
        Insert: {
          access_count?: number
          code_hash: string
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          last_access_at?: string | null
          status?: string
          type?: string
        }
        Update: {
          access_count?: number
          code_hash?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          last_access_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent: string
          created_at: string
          id: string
          report: string | null
          started_at: string
          status: string
          summary: string | null
        }
        Insert: {
          agent: string
          created_at?: string
          id?: string
          report?: string | null
          started_at?: string
          status?: string
          summary?: string | null
        }
        Update: {
          agent?: string
          created_at?: string
          id?: string
          report?: string | null
          started_at?: string
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: number
          payload: Json | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: number
          payload?: Json | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: number
          payload?: Json | null
          session_id?: string | null
        }
        Relationships: []
      }
      audience_contacts: {
        Row: {
          added_at: string | null
          age: number | null
          city: string | null
          consent_requested_at: string | null
          country: string | null
          created_at: string
          email: string | null
          engagement: string | null
          events_count: number | null
          external_ref: string | null
          first_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          last_purchase_at: string | null
          newsletter_optin: boolean
          notifications_optin: boolean
          optin_at: string | null
          optin_token: string
          optout_at: string | null
          origin: string | null
          phone: string | null
          recency: string | null
          score: number | null
          segment: string
          tags: string[]
          tickets_count: number | null
          total_spent: number | null
          zone: string | null
        }
        Insert: {
          added_at?: string | null
          age?: number | null
          city?: string | null
          consent_requested_at?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          engagement?: string | null
          events_count?: number | null
          external_ref?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_purchase_at?: string | null
          newsletter_optin?: boolean
          notifications_optin?: boolean
          optin_at?: string | null
          optin_token?: string
          optout_at?: string | null
          origin?: string | null
          phone?: string | null
          recency?: string | null
          score?: number | null
          segment?: string
          tags?: string[]
          tickets_count?: number | null
          total_spent?: number | null
          zone?: string | null
        }
        Update: {
          added_at?: string | null
          age?: number | null
          city?: string | null
          consent_requested_at?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          engagement?: string | null
          events_count?: number | null
          external_ref?: string | null
          first_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          last_purchase_at?: string | null
          newsletter_optin?: boolean
          notifications_optin?: boolean
          optin_at?: string | null
          optin_token?: string
          optout_at?: string | null
          origin?: string | null
          phone?: string | null
          recency?: string | null
          score?: number | null
          segment?: string
          tags?: string[]
          tickets_count?: number | null
          total_spent?: number | null
          zone?: string | null
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
        Relationships: [
          {
            foreignKeyName: "authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_topic_proposals: {
        Row: {
          angle: string | null
          brief: string
          chosen_at: string | null
          created_at: string
          editorial_item_id: string | null
          id: string
          source_url: string | null
          title: string
          token: string
          week: string
          why_now: string | null
        }
        Insert: {
          angle?: string | null
          brief: string
          chosen_at?: string | null
          created_at?: string
          editorial_item_id?: string | null
          id?: string
          source_url?: string | null
          title: string
          token?: string
          week: string
          why_now?: string | null
        }
        Update: {
          angle?: string | null
          brief?: string
          chosen_at?: string | null
          created_at?: string
          editorial_item_id?: string | null
          id?: string
          source_url?: string | null
          title?: string
          token?: string
          week?: string
          why_now?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_topic_proposals_editorial_item_id_fkey"
            columns: ["editorial_item_id"]
            isOneToOne: false
            referencedRelation: "editorial_items"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_due: number
          created_at: string
          email: string
          id: string
          items: Json
          nb_travelers: number
          nom: string
          payment_method: string
          payment_mode: string
          prenom: string
          reference: string
          status: string
          subtotal: number
          telephone: string
          travelers: Json
          updated_at: string
        }
        Insert: {
          amount_due?: number
          created_at?: string
          email: string
          id?: string
          items?: Json
          nb_travelers?: number
          nom: string
          payment_method: string
          payment_mode: string
          prenom: string
          reference: string
          status?: string
          subtotal?: number
          telephone: string
          travelers?: Json
          updated_at?: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          email?: string
          id?: string
          items?: Json
          nb_travelers?: number
          nom?: string
          payment_method?: string
          payment_mode?: string
          prenom?: string
          reference?: string
          status?: string
          subtotal?: number
          telephone?: string
          travelers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
          kind: string
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
          kind: string
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
          kind?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      chapter_translations: {
        Row: {
          chapter_id: string
          created_at: string
          id: string
          intro: string | null
          language: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          chapter_id: string
          created_at?: string
          id?: string
          intro?: string | null
          language: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string
          created_at?: string
          id?: string
          intro?: string | null
          language?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_translations_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          cover_media: string | null
          created_at: string
          id: string
          intro: string | null
          number: string
          position: number
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cover_media?: string | null
          created_at?: string
          id?: string
          intro?: string | null
          number: string
          position: number
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cover_media?: string | null
          created_at?: string
          id?: string
          intro?: string | null
          number?: string
          position?: number
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          assigned_to: string | null
          billing_address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_contact_at: string | null
          legal_type: string
          notes: string | null
          phone: string | null
          siret: string | null
          source: string | null
          stage: string
          status: string
          tags: string[]
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          assigned_to?: string | null
          billing_address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_contact_at?: string | null
          legal_type?: string
          notes?: string | null
          phone?: string | null
          siret?: string | null
          source?: string | null
          stage?: string
          status?: string
          tags?: string[]
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          assigned_to?: string | null
          billing_address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_contact_at?: string | null
          legal_type?: string
          notes?: string | null
          phone?: string | null
          siret?: string | null
          source?: string | null
          stage?: string
          status?: string
          tags?: string[]
          updated_at?: string
          vat_number?: string | null
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
          scope: Json
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
          scope?: Json
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
          scope?: Json
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
          mentions: Json
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          selection: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          content_id: string
          created_at?: string
          id?: string
          mentions?: Json
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          content_id?: string
          created_at?: string
          id?: string
          mentions?: Json
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          selection?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "content_comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      content_poles: {
        Row: {
          channels: string[]
          code: string
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          channels?: string[]
          code: string
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          channels?: string[]
          code?: string
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      content_revisions: {
        Row: {
          content_id: string
          created_at: string
          editor_id: string | null
          from_status: string | null
          id: string
          note: string | null
          snapshot: Json | null
          to_status: string | null
        }
        Insert: {
          content_id: string
          created_at?: string
          editor_id?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          snapshot?: Json | null
          to_status?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string
          editor_id?: string | null
          from_status?: string | null
          id?: string
          note?: string | null
          snapshot?: Json | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_revisions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_revisions_editor_id_fkey"
            columns: ["editor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          hashtags: Json
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
          status: string
          subtitle: string | null
          tags: Json
          title: string
          type: string
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
          hashtags?: Json
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
          status?: string
          subtitle?: string | null
          tags?: Json
          title: string
          type: string
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
          hashtags?: Json
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
          status?: string
          subtitle?: string | null
          tags?: Json
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          partner_id: string | null
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
          partner_id?: string | null
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
          partner_id?: string | null
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
            foreignKeyName: "crm_tasks_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
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
      daily_briefs: {
        Row: {
          content: string
          created_at: string
          day: string
          sent_at: string | null
          source: string
        }
        Insert: {
          content: string
          created_at?: string
          day: string
          sent_at?: string | null
          source?: string
        }
        Update: {
          content?: string
          created_at?: string
          day?: string
          sent_at?: string | null
          source?: string
        }
        Relationships: []
      }
      devis_nordeste: {
        Row: {
          activites: string[] | null
          budget_personne: string | null
          created_at: string | null
          date_depart: string | null
          duree: string | null
          email: string
          id: string
          message: string | null
          nb_voyageurs: number
          niveau_confort: string | null
          nom: string
          notes_internes: string | null
          prenom: string
          statut: string | null
          telephone: string
          type_vehicule: string | null
          villes_souhaitees: string[] | null
        }
        Insert: {
          activites?: string[] | null
          budget_personne?: string | null
          created_at?: string | null
          date_depart?: string | null
          duree?: string | null
          email: string
          id?: string
          message?: string | null
          nb_voyageurs?: number
          niveau_confort?: string | null
          nom: string
          notes_internes?: string | null
          prenom: string
          statut?: string | null
          telephone: string
          type_vehicule?: string | null
          villes_souhaitees?: string[] | null
        }
        Update: {
          activites?: string[] | null
          budget_personne?: string | null
          created_at?: string | null
          date_depart?: string | null
          duree?: string | null
          email?: string
          id?: string
          message?: string | null
          nb_voyageurs?: number
          niveau_confort?: string | null
          nom?: string
          notes_internes?: string | null
          prenom?: string
          statut?: string | null
          telephone?: string
          type_vehicule?: string | null
          villes_souhaitees?: string[] | null
        }
        Relationships: []
      }
      editorial_items: {
        Row: {
          channel: string | null
          collection: string | null
          created_at: string
          deadline: string | null
          done_token: string
          experience_id: string | null
          external_ref: string | null
          id: string
          kind: string
          notes: string | null
          owner: string | null
          planned_at: string | null
          priority: string | null
          reminded_at: string | null
          source_url: string | null
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          channel?: string | null
          collection?: string | null
          created_at?: string
          deadline?: string | null
          done_token?: string
          experience_id?: string | null
          external_ref?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner?: string | null
          planned_at?: string | null
          priority?: string | null
          reminded_at?: string | null
          source_url?: string | null
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          channel?: string | null
          collection?: string | null
          created_at?: string
          deadline?: string | null
          done_token?: string
          experience_id?: string | null
          external_ref?: string | null
          id?: string
          kind?: string
          notes?: string | null
          owner?: string | null
          planned_at?: string | null
          priority?: string | null
          reminded_at?: string | null
          source_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "editorial_items_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          message_id: string | null
          metadata: Json
          recipient_email: string
          status: string
          template_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          message_id?: string | null
          metadata?: Json
          recipient_email: string
          status: string
          template_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          message_id?: string | null
          metadata?: Json
          recipient_email?: string
          status?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          token: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          token: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          token?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_partner_sales: {
        Row: {
          created_at: string
          event_id: string
          id: string
          note: string | null
          paid: boolean
          paid_at: string | null
          partner_id: string | null
          partner_name: string
          tickets: number
          updated_at: string
          vip_revenue: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          partner_id?: string | null
          partner_name: string
          tickets?: number
          updated_at?: string
          vip_revenue?: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          note?: string | null
          paid?: boolean
          paid_at?: string | null
          partner_id?: string | null
          partner_name?: string
          tickets?: number
          updated_at?: string
          vip_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_partner_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_partner_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_partner_sales_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      event_promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_pct: number
          event_id: string
          id: string
          paid: boolean
          partner_id: string | null
          platform: string
          revenue: number
          uses: number
          vip_revenue: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_pct?: number
          event_id: string
          id?: string
          paid?: boolean
          partner_id?: string | null
          platform?: string
          revenue?: number
          uses?: number
          vip_revenue?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_pct?: number
          event_id?: string
          id?: string
          paid?: boolean
          partner_id?: string | null
          platform?: string
          revenue?: number
          uses?: number
          vip_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_promo_codes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_promo_codes_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      event_settlements: {
        Row: {
          bar_revenue: number
          drinks_cost: number
          event_id: string
          house_costs: number
          notes: string | null
          other_costs: number
          ticket_revenue: number
          updated_at: string
          vip_revenue: number
        }
        Insert: {
          bar_revenue?: number
          drinks_cost?: number
          event_id: string
          house_costs?: number
          notes?: string | null
          other_costs?: number
          ticket_revenue?: number
          updated_at?: string
          vip_revenue?: number
        }
        Update: {
          bar_revenue?: number
          drinks_cost?: number
          event_id?: string
          house_costs?: number
          notes?: string | null
          other_costs?: number
          ticket_revenue?: number
          updated_at?: string
          vip_revenue?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_settlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_settlements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_counts: {
        Row: {
          channel: string
          event_id: string
          id: string
          note: string | null
          recorded_at: string
          revenue: number | null
          source: string
          tickets: number
          vip_revenue: number | null
          vip_tables: number
        }
        Insert: {
          channel: string
          event_id: string
          id?: string
          note?: string | null
          recorded_at?: string
          revenue?: number | null
          source?: string
          tickets?: number
          vip_revenue?: number | null
          vip_tables?: number
        }
        Update: {
          channel?: string
          event_id?: string
          id?: string
          note?: string | null
          recorded_at?: string
          revenue?: number | null
          source?: string
          tickets?: number
          vip_revenue?: number | null
          vip_tables?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_counts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_counts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_lots: {
        Row: {
          event_id: string
          id: string
          name: string
          notes: string | null
          price: number
          quantity: number | null
          sales_end: string | null
          sales_start: string | null
          sort: number
        }
        Insert: {
          event_id: string
          id?: string
          name: string
          notes?: string | null
          price: number
          quantity?: number | null
          sales_end?: string | null
          sales_start?: string | null
          sort?: number
        }
        Update: {
          event_id?: string
          id?: string
          name?: string
          notes?: string | null
          price?: number
          quantity?: number | null
          sales_end?: string | null
          sales_start?: string | null
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_lots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_lots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tracking_links: {
        Row: {
          created_at: string
          event_id: string
          id: string
          label: string
          partner_id: string | null
          url: string
          utm_source: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          label: string
          partner_id?: string | null
          url: string
          utm_source: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          label?: string
          partner_id?: string | null
          url?: string
          utm_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tracking_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tracking_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tracking_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          cofounder_share_pct: number
          created_at: string
          currency: string
          door_price: number | null
          edition: string | null
          ends_at: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          partner_ticket_commission: number
          partner_vip_commission_pct: number
          presale_target: number | null
          shotgun_event_id: string | null
          starts_at: string
          status: string
          sympla_event_id: string | null
          updated_at: string
          venue: string | null
          venue_share_pct: number
        }
        Insert: {
          capacity?: number | null
          cofounder_share_pct?: number
          created_at?: string
          currency?: string
          door_price?: number | null
          edition?: string | null
          ends_at?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          partner_ticket_commission?: number
          partner_vip_commission_pct?: number
          presale_target?: number | null
          shotgun_event_id?: string | null
          starts_at: string
          status?: string
          sympla_event_id?: string | null
          updated_at?: string
          venue?: string | null
          venue_share_pct?: number
        }
        Update: {
          capacity?: number | null
          cofounder_share_pct?: number
          created_at?: string
          currency?: string
          door_price?: number | null
          edition?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          partner_ticket_commission?: number
          partner_vip_commission_pct?: number
          presale_target?: number | null
          shotgun_event_id?: string | null
          starts_at?: string
          status?: string
          sympla_event_id?: string | null
          updated_at?: string
          venue?: string | null
          venue_share_pct?: number
        }
        Relationships: []
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
      ig_accounts: {
        Row: {
          channel: string
          ig_user_id: string
          username: string
        }
        Insert: {
          channel: string
          ig_user_id: string
          username: string
        }
        Update: {
          channel?: string
          ig_user_id?: string
          username?: string
        }
        Relationships: []
      }
      ig_media: {
        Row: {
          caption: string | null
          channel: string
          comments_count: number | null
          editorial_item_id: string | null
          first_seen_at: string
          id: string
          ig_user_id: string
          kind: string
          like_count: number | null
          media_type: string | null
          permalink: string | null
          posted_at: string
          product_type: string | null
          raw: Json | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          channel: string
          comments_count?: number | null
          editorial_item_id?: string | null
          first_seen_at?: string
          id: string
          ig_user_id: string
          kind: string
          like_count?: number | null
          media_type?: string | null
          permalink?: string | null
          posted_at: string
          product_type?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          channel?: string
          comments_count?: number | null
          editorial_item_id?: string | null
          first_seen_at?: string
          id?: string
          ig_user_id?: string
          kind?: string
          like_count?: number | null
          media_type?: string | null
          permalink?: string | null
          posted_at?: string
          product_type?: string | null
          raw?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_media_editorial_item_id_fkey"
            columns: ["editorial_item_id"]
            isOneToOne: true
            referencedRelation: "editorial_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_ig_user_id_fkey"
            columns: ["ig_user_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["ig_user_id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          created_at: string
          currency: string
          exclusions: string[]
          experience_id: string | null
          id: string
          inclusions: string[]
          invoice_id: string
          label: string
          position: number
          quantity: number
          service_id: string | null
          ticket_offer_id: string | null
          ticket_offer_variant_id: string | null
          unit: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          currency?: string
          exclusions?: string[]
          experience_id?: string | null
          id?: string
          inclusions?: string[]
          invoice_id: string
          label: string
          position?: number
          quantity?: number
          service_id?: string | null
          ticket_offer_id?: string | null
          ticket_offer_variant_id?: string | null
          unit?: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          currency?: string
          exclusions?: string[]
          experience_id?: string | null
          id?: string
          inclusions?: string[]
          invoice_id?: string
          label?: string
          position?: number
          quantity?: number
          service_id?: string | null
          ticket_offer_id?: string | null
          ticket_offer_variant_id?: string | null
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_ticket_offer_id_fkey"
            columns: ["ticket_offer_id"]
            isOneToOne: false
            referencedRelation: "ticket_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_ticket_offer_variant_id_fkey"
            columns: ["ticket_offer_variant_id"]
            isOneToOne: false
            referencedRelation: "ticket_offer_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_number_sequences: {
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
      invoices: {
        Row: {
          billing_address: string | null
          billing_company_name: string | null
          billing_legal_type: string
          billing_name: string
          billing_siret: string | null
          billing_vat_number: string | null
          booking_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          issue_date: string
          language: string
          notes: string | null
          number: string
          paid_at: string | null
          quote_id: string | null
          sale_id: string | null
          status: string
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          billing_company_name?: string | null
          billing_legal_type?: string
          billing_name: string
          billing_siret?: string | null
          billing_vat_number?: string | null
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          language?: string
          notes?: string | null
          number: string
          paid_at?: string | null
          quote_id?: string | null
          sale_id?: string | null
          status?: string
          title: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          billing_company_name?: string | null
          billing_legal_type?: string
          billing_name?: string
          billing_siret?: string | null
          billing_vat_number?: string | null
          booking_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          language?: string
          notes?: string | null
          number?: string
          paid_at?: string | null
          quote_id?: string | null
          sale_id?: string | null
          status?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
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
      manual_sections_backup_20260819: {
        Row: {
          blocks: Json | null
          chapter_slug: string | null
          created_at: string | null
          id: string | null
          kicker: string | null
          position: number | null
          search_text: string | null
          slug: string | null
          subtitle: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          blocks?: Json | null
          chapter_slug?: string | null
          created_at?: string | null
          id?: string | null
          kicker?: string | null
          position?: number | null
          search_text?: string | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          blocks?: Json | null
          chapter_slug?: string | null
          created_at?: string | null
          id?: string | null
          kicker?: string | null
          position?: number | null
          search_text?: string | null
          slug?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      manual_sessions: {
        Row: {
          code_id: string
          created_at: string
          expires_at: string
          id: string
          last_chapter: string | null
          last_section: string | null
          last_seen_at: string
          scope: string
          token_hash: string
        }
        Insert: {
          code_id: string
          created_at?: string
          expires_at: string
          id?: string
          last_chapter?: string | null
          last_section?: string | null
          last_seen_at?: string
          scope?: string
          token_hash: string
        }
        Update: {
          code_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_chapter?: string | null
          last_section?: string | null
          last_seen_at?: string
          scope?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_sessions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_visual_assets: {
        Row: {
          alt: string | null
          asset_key: string
          category: string
          created_at: string
          id: string
          page_slug: string | null
          position: number | null
          required: boolean
          source: string | null
          status: string
          type: string | null
          updated_at: string
          url: string | null
          variant: string | null
        }
        Insert: {
          alt?: string | null
          asset_key: string
          category: string
          created_at?: string
          id?: string
          page_slug?: string | null
          position?: number | null
          required?: boolean
          source?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          variant?: string | null
        }
        Update: {
          alt?: string | null
          asset_key?: string
          category?: string
          created_at?: string
          id?: string
          page_slug?: string | null
          position?: number | null
          required?: boolean
          source?: string | null
          status?: string
          type?: string | null
          updated_at?: string
          url?: string | null
          variant?: string | null
        }
        Relationships: []
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
          updated_at: string | null
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
          updated_at?: string | null
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
          updated_at?: string | null
          uploaded_by?: string | null
          url?: string
          used_count?: number
          width?: number | null
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt: string | null
          caption: string | null
          chapter_slug: string | null
          created_at: string
          crop: Json | null
          id: string
          key: string
          mobile_crop: Json | null
          position: number | null
          source: string | null
          updated_at: string
          url: string
        }
        Insert: {
          alt?: string | null
          caption?: string | null
          chapter_slug?: string | null
          created_at?: string
          crop?: Json | null
          id?: string
          key: string
          mobile_crop?: Json | null
          position?: number | null
          source?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          alt?: string | null
          caption?: string | null
          chapter_slug?: string | null
          created_at?: string
          crop?: Json | null
          id?: string
          key?: string
          mobile_crop?: Json | null
          position?: number | null
          source?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      ota_bookings: {
        Row: {
          activity_language: string | null
          activity_title: string | null
          booking_ref: string
          client_id: string | null
          created_at: string
          currency: string | null
          id: string
          lead_email: string | null
          lead_language: string | null
          lead_name: string | null
          lead_phone: string | null
          listing_id: string | null
          notes: string | null
          participants: number | null
          participants_detail: string | null
          platform: string
          price: number | null
          review_requested: boolean
          source_email_id: string | null
          start_at: string | null
          status: string
          supplier_ref: string | null
          updated_at: string
        }
        Insert: {
          activity_language?: string | null
          activity_title?: string | null
          booking_ref: string
          client_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lead_email?: string | null
          lead_language?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          listing_id?: string | null
          notes?: string | null
          participants?: number | null
          participants_detail?: string | null
          platform?: string
          price?: number | null
          review_requested?: boolean
          source_email_id?: string | null
          start_at?: string | null
          status?: string
          supplier_ref?: string | null
          updated_at?: string
        }
        Update: {
          activity_language?: string | null
          activity_title?: string | null
          booking_ref?: string
          client_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          lead_email?: string | null
          lead_language?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          listing_id?: string | null
          notes?: string | null
          participants?: number | null
          participants_detail?: string | null
          platform?: string
          price?: number | null
          review_requested?: boolean
          source_email_id?: string | null
          start_at?: string | null
          status?: string
          supplier_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ota_bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ota_bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "ota_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      ota_listings: {
        Row: {
          bookings_count: number
          created_at: string
          experience_id: string | null
          external_id: string | null
          id: string
          issue: string | null
          last_checked_at: string | null
          meeting_point: string | null
          notes: string | null
          platform: string
          prep_note: string | null
          rating: number | null
          reviews_count: number
          status: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          bookings_count?: number
          created_at?: string
          experience_id?: string | null
          external_id?: string | null
          id?: string
          issue?: string | null
          last_checked_at?: string | null
          meeting_point?: string | null
          notes?: string | null
          platform?: string
          prep_note?: string | null
          rating?: number | null
          reviews_count?: number
          status?: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          bookings_count?: number
          created_at?: string
          experience_id?: string | null
          external_id?: string | null
          id?: string
          issue?: string | null
          last_checked_at?: string | null
          meeting_point?: string | null
          notes?: string | null
          platform?: string
          prep_note?: string | null
          rating?: number | null
          reviews_count?: number
          status?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ota_listings_experience_id_fkey"
            columns: ["experience_id"]
            isOneToOne: false
            referencedRelation: "experiences"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          application: Json | null
          category: string | null
          commission_rate: number | null
          contact_name: string | null
          created_at: string
          email: string | null
          google_maps_url: string | null
          id: string
          instagram: string | null
          is_active: boolean
          kind: string
          last_contact_at: string | null
          location: string | null
          name: string
          next_action: string | null
          next_action_at: string | null
          notes: string | null
          phone: string | null
          ref_code: string | null
          source: string
          status: string
          submitted_at: string | null
          terms: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          application?: Json | null
          category?: string | null
          commission_rate?: number | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          kind?: string
          last_contact_at?: string | null
          location?: string | null
          name: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          ref_code?: string | null
          source?: string
          status?: string
          submitted_at?: string | null
          terms?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          application?: Json | null
          category?: string | null
          commission_rate?: number | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          kind?: string
          last_contact_at?: string | null
          location?: string | null
          name?: string
          next_action?: string | null
          next_action_at?: string | null
          notes?: string | null
          phone?: string | null
          ref_code?: string | null
          source?: string
          status?: string
          submitted_at?: string | null
          terms?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string | null
          created_at: string
          currency: string
          event_id: string | null
          id: string
          kind: string
          method: string | null
          notes: string | null
          paid_at: string
          partner_id: string | null
          quote_id: string | null
          reference: string | null
          trip_id: string | null
        }
        Insert: {
          amount: number
          client_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          id?: string
          kind?: string
          method?: string | null
          notes?: string | null
          paid_at: string
          partner_id?: string | null
          quote_id?: string | null
          reference?: string | null
          trip_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string | null
          created_at?: string
          currency?: string
          event_id?: string | null
          id?: string
          kind?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          partner_id?: string | null
          quote_id?: string | null
          reference?: string | null
          trip_id?: string | null
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
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
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
      places: {
        Row: {
          created_at: string
          external_ref: string | null
          google_maps_url: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string
          external_ref?: string | null
          google_maps_url?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string
          external_ref?: string | null
          google_maps_url?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          zone?: string | null
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
          short_name: string | null
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
          short_name?: string | null
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
          short_name?: string | null
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
          status: string
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
          status?: string
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
          status?: string
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
          {
            foreignKeyName: "publications_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          exclusions: string[]
          experience_id: string | null
          icon: string | null
          id: string
          inclusions: string[]
          label: string
          position: number
          quantity: number
          quote_id: string
          service_id: string | null
          ticket_offer_id: string | null
          ticket_offer_variant_id: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          exclusions?: string[]
          experience_id?: string | null
          icon?: string | null
          id?: string
          inclusions?: string[]
          label: string
          position?: number
          quantity?: number
          quote_id: string
          service_id?: string | null
          ticket_offer_id?: string | null
          ticket_offer_variant_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          details?: Json
          exclusions?: string[]
          experience_id?: string | null
          icon?: string | null
          id?: string
          inclusions?: string[]
          label?: string
          position?: number
          quantity?: number
          quote_id?: string
          service_id?: string | null
          ticket_offer_id?: string | null
          ticket_offer_variant_id?: string | null
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
          {
            foreignKeyName: "quote_lines_ticket_offer_variant_id_fkey"
            columns: ["ticket_offer_variant_id"]
            isOneToOne: false
            referencedRelation: "ticket_offer_variants"
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
          language: string
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
          language?: string
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
          language?: string
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
      reservations: {
        Row: {
          adresse_exacte: string | null
          categorie: string | null
          created_at: string | null
          date_souhaitee: string | null
          email: string
          experience: string
          heure: string | null
          id: string
          message: string | null
          montant_paye: number | null
          montant_total: number | null
          nb_voyageurs: number
          nom: string
          notes_internes: string | null
          prenom: string
          quartier_pickup: string | null
          statut: string | null
          telephone: string
        }
        Insert: {
          adresse_exacte?: string | null
          categorie?: string | null
          created_at?: string | null
          date_souhaitee?: string | null
          email: string
          experience: string
          heure?: string | null
          id?: string
          message?: string | null
          montant_paye?: number | null
          montant_total?: number | null
          nb_voyageurs?: number
          nom: string
          notes_internes?: string | null
          prenom: string
          quartier_pickup?: string | null
          statut?: string | null
          telephone: string
        }
        Update: {
          adresse_exacte?: string | null
          categorie?: string | null
          created_at?: string | null
          date_souhaitee?: string | null
          email?: string
          experience?: string
          heure?: string | null
          id?: string
          message?: string | null
          montant_paye?: number | null
          montant_total?: number | null
          nb_voyageurs?: number
          nom?: string
          notes_internes?: string | null
          prenom?: string
          quartier_pickup?: string | null
          statut?: string | null
          telephone?: string
        }
        Relationships: []
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
      sales: {
        Row: {
          access_code_id: string | null
          access_code_plain: string | null
          amount_total: number
          channel_id: string | null
          commission_amount: number
          commission_paid_at: string | null
          commission_rate: number
          created_at: string
          currency: string
          customer_email: string | null
          id: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          access_code_id?: string | null
          access_code_plain?: string | null
          amount_total?: number
          channel_id?: string | null
          commission_amount?: number
          commission_paid_at?: string | null
          commission_rate?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          stripe_checkout_session_id: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          access_code_id?: string | null
          access_code_plain?: string | null
          amount_total?: number
          channel_id?: string | null
          commission_amount?: number
          commission_paid_at?: string | null
          commission_rate?: number
          created_at?: string
          currency?: string
          customer_email?: string | null
          id?: string
          stripe_checkout_session_id?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_access_code_id_fkey"
            columns: ["access_code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "sales_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_channels: {
        Row: {
          active: boolean
          commission_rate: number
          created_at: string
          id: string
          name: string
          slug: string | null
          stripe_payment_link_id: string | null
        }
        Insert: {
          active?: boolean
          commission_rate?: number
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          stripe_payment_link_id?: string | null
        }
        Update: {
          active?: boolean
          commission_rate?: number
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          stripe_payment_link_id?: string | null
        }
        Relationships: []
      }
      section_translations: {
        Row: {
          blocks: Json | null
          created_at: string
          id: string
          kicker: string | null
          language: string
          search_text: string | null
          section_id: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json | null
          created_at?: string
          id?: string
          kicker?: string | null
          language: string
          search_text?: string | null
          section_id: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json | null
          created_at?: string
          id?: string
          kicker?: string | null
          language?: string
          search_text?: string | null
          section_id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_translations_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          blocks: Json
          chapter_slug: string
          created_at: string
          id: string
          kicker: string | null
          position: number
          search_text: string | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          chapter_slug: string
          created_at?: string
          id?: string
          kicker?: string | null
          position: number
          search_text?: string | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          chapter_slug?: string
          created_at?: string
          id?: string
          kicker?: string | null
          position?: number
          search_text?: string | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_chapter_slug_fkey"
            columns: ["chapter_slug"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["slug"]
          },
        ]
      }
      services: {
        Row: {
          bookable: boolean
          category: string | null
          commission_basis: string
          commission_pct: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          fixed_cost: number | null
          group_slug: string | null
          id: string
          is_active: boolean
          is_published: boolean
          metadata: Json
          partner_id: string | null
          price_from: number | null
          price_label: string | null
          price_model: string
          requires_driver: boolean
          slug: string | null
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
          created_by?: string | null
          currency?: string
          description?: string | null
          fixed_cost?: number | null
          group_slug?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          metadata?: Json
          partner_id?: string | null
          price_from?: number | null
          price_label?: string | null
          price_model?: string
          requires_driver?: boolean
          slug?: string | null
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
          created_by?: string | null
          currency?: string
          description?: string | null
          fixed_cost?: number | null
          group_slug?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          metadata?: Json
          partner_id?: string | null
          price_from?: number | null
          price_label?: string | null
          price_model?: string
          requires_driver?: boolean
          slug?: string | null
          supplier_cost?: number | null
          supplier_net?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string | null
        }
        Relationships: []
      }
      team_briefs: {
        Row: {
          content: string
          created_at: string | null
          day: string
          person: string
          sent_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          day: string
          person: string
          sent_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          day?: string
          person?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      team_requests: {
        Row: {
          answer: string | null
          created_at: string
          details: string | null
          event_id: string | null
          handled_at: string | null
          id: string
          needed_by: string | null
          pole: string | null
          requested_by: string
          requester_name: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          details?: string | null
          event_id?: string | null
          handled_at?: string | null
          id?: string
          needed_by?: string | null
          pole?: string | null
          requested_by: string
          requester_name?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          details?: string | null
          event_id?: string | null
          handled_at?: string | null
          id?: string
          needed_by?: string | null
          pole?: string | null
          requested_by?: string
          requester_name?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_requests_pole_fkey"
            columns: ["pole"]
            isOneToOne: false
            referencedRelation: "content_poles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "team_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_offer_variants: {
        Row: {
          capacity: number | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          label: string
          public_price: number | null
          sort_order: number
          ticket_offer_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          label: string
          public_price?: number | null
          sort_order?: number
          ticket_offer_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          label?: string
          public_price?: number | null
          sort_order?: number
          ticket_offer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_offer_variants_ticket_offer_id_fkey"
            columns: ["ticket_offer_id"]
            isOneToOne: false
            referencedRelation: "ticket_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_offers: {
        Row: {
          category: string | null
          commission_basis: string
          commission_pct: number
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          description_en: string | null
          description_es: string | null
          description_pt: string | null
          event_date: string | null
          event_time: string | null
          fixed_cost: number | null
          id: string
          is_active: boolean
          is_published: boolean
          metadata: Json
          notes: string | null
          photo_ratio: string
          photo_url: string | null
          pricing_model: string
          public_price: number | null
          slug: string | null
          supplier_cost: number | null
          supplier_net: number | null
          title: string
          title_en: string | null
          title_es: string | null
          title_pt: string | null
          updated_at: string
          venue: string | null
          venue_en: string | null
          venue_es: string | null
          venue_pt: string | null
        }
        Insert: {
          category?: string | null
          commission_basis?: string
          commission_pct?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          description_pt?: string | null
          event_date?: string | null
          event_time?: string | null
          fixed_cost?: number | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          metadata?: Json
          notes?: string | null
          photo_ratio?: string
          photo_url?: string | null
          pricing_model?: string
          public_price?: number | null
          slug?: string | null
          supplier_cost?: number | null
          supplier_net?: number | null
          title: string
          title_en?: string | null
          title_es?: string | null
          title_pt?: string | null
          updated_at?: string
          venue?: string | null
          venue_en?: string | null
          venue_es?: string | null
          venue_pt?: string | null
        }
        Update: {
          category?: string | null
          commission_basis?: string
          commission_pct?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          description_en?: string | null
          description_es?: string | null
          description_pt?: string | null
          event_date?: string | null
          event_time?: string | null
          fixed_cost?: number | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          metadata?: Json
          notes?: string | null
          photo_ratio?: string
          photo_url?: string | null
          pricing_model?: string
          public_price?: number | null
          slug?: string | null
          supplier_cost?: number | null
          supplier_net?: number | null
          title?: string
          title_en?: string | null
          title_es?: string | null
          title_pt?: string | null
          updated_at?: string
          venue?: string | null
          venue_en?: string | null
          venue_es?: string | null
          venue_pt?: string | null
        }
        Relationships: []
      }
      ticket_sales: {
        Row: {
          channel: string
          currency: string | null
          event_id: string
          external_id: string
          lot: string | null
          order_id: string | null
          price: number | null
          promo_code: string | null
          raw: Json | null
          sold_at: string | null
          status: string | null
          synced_at: string
          utm_source: string | null
        }
        Insert: {
          channel: string
          currency?: string | null
          event_id: string
          external_id: string
          lot?: string | null
          order_id?: string | null
          price?: number | null
          promo_code?: string | null
          raw?: Json | null
          sold_at?: string | null
          status?: string | null
          synced_at?: string
          utm_source?: string | null
        }
        Update: {
          channel?: string
          currency?: string | null
          event_id?: string
          external_id?: string
          lot?: string | null
          order_id?: string | null
          price?: number | null
          promo_code?: string | null
          raw?: Json | null
          sold_at?: string | null
          status?: string | null
          synced_at?: string
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_sync_requests: {
        Row: {
          channel: string
          created_at: string
          error: string | null
          event_id: string
          id: number
          kind: string
          processed_at: string | null
          request_id: number
          status_code: number | null
        }
        Insert: {
          channel: string
          created_at?: string
          error?: string | null
          event_id: string
          id?: number
          kind: string
          processed_at?: string | null
          request_id: number
          status_code?: number | null
        }
        Update: {
          channel?: string
          created_at?: string
          error?: string | null
          event_id?: string
          id?: number
          kind?: string
          processed_at?: string | null
          request_id?: number
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sync_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sync_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_accommodations: {
        Row: {
          address: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          neighborhood: string | null
          notes: string | null
          position: number
          start_date: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          neighborhood?: string | null
          notes?: string | null
          position?: number
          start_date?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          neighborhood?: string | null
          notes?: string | null
          position?: number
          start_date?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_accommodations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_activities: {
        Row: {
          activity_type: string
          category: string | null
          client_informed_at: string | null
          commission_amount: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          day: string | null
          display_time: string | null
          experience_id: string | null
          id: string
          is_offered: boolean
          kind: string
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
          slot: string | null
          slot_span: number
          status: string
          supplier_cost: number
          ticket_offer_id: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          activity_type?: string
          category?: string | null
          client_informed_at?: string | null
          commission_amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          day?: string | null
          display_time?: string | null
          experience_id?: string | null
          id?: string
          is_offered?: boolean
          kind?: string
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
          slot?: string | null
          slot_span?: number
          status?: string
          supplier_cost?: number
          ticket_offer_id?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          activity_type?: string
          category?: string | null
          client_informed_at?: string | null
          commission_amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          day?: string | null
          display_time?: string | null
          experience_id?: string | null
          id?: string
          is_offered?: boolean
          kind?: string
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
          slot?: string | null
          slot_span?: number
          status?: string
          supplier_cost?: number
          ticket_offer_id?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      trip_logistics: {
        Row: {
          arrival_airport: string | null
          arrival_date: string | null
          arrival_flight: string | null
          arrival_time: string | null
          departure_airport: string | null
          departure_date: string | null
          departure_flight: string | null
          departure_time: string | null
          sim_discount: boolean
          sim_operator: string | null
          sim_plan: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          arrival_airport?: string | null
          arrival_date?: string | null
          arrival_flight?: string | null
          arrival_time?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          departure_time?: string | null
          sim_discount?: boolean
          sim_operator?: string | null
          sim_plan?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          arrival_airport?: string | null
          arrival_date?: string | null
          arrival_flight?: string | null
          arrival_time?: string | null
          departure_airport?: string | null
          departure_date?: string | null
          departure_flight?: string | null
          departure_time?: string | null
          sim_discount?: boolean
          sim_operator?: string | null
          sim_plan?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_logistics_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: true
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
      trip_settings: {
        Row: {
          id: number
          trip_creation_mode: string
          updated_at: string
        }
        Insert: {
          id?: number
          trip_creation_mode?: string
          updated_at?: string
        }
        Update: {
          id?: number
          trip_creation_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      trip_transfers: {
        Row: {
          created_at: string
          id: string
          included: boolean
          notes: string | null
          position: number
          provider: string | null
          route: string
          transfer_date: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          included?: boolean
          notes?: string | null
          position?: number
          provider?: string | null
          route: string
          transfer_date?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          included?: boolean
          notes?: string | null
          position?: number
          provider?: string | null
          route?: string
          transfer_date?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_transfers_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
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
          margin_amount: number
          metadata: Json
          notes: string | null
          notes_internal: string | null
          party_size: number | null
          payments: Json
          quote_id: string | null
          quoted_amount: number
          reference: string
          source: string
          source_prospect_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          supplier_cost: number
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
          margin_amount?: number
          metadata?: Json
          notes?: string | null
          notes_internal?: string | null
          party_size?: number | null
          payments?: Json
          quote_id?: string | null
          quoted_amount?: number
          reference: string
          source?: string
          source_prospect_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          supplier_cost?: number
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
          margin_amount?: number
          metadata?: Json
          notes?: string | null
          notes_internal?: string | null
          party_size?: number | null
          payments?: Json
          quote_id?: string | null
          quoted_amount?: number
          reference?: string
          source?: string
          source_prospect_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          supplier_cost?: number
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
      trouver_jeitinho: {
        Row: {
          budget: string | null
          created_at: string | null
          duree: string | null
          email: string
          extras: Json | null
          id: string
          interets: string[] | null
          nb_voyageurs: string | null
          notes_internes: string | null
          prenom: string
          programme_genere: string | null
          statut: string | null
          telephone: string
        }
        Insert: {
          budget?: string | null
          created_at?: string | null
          duree?: string | null
          email: string
          extras?: Json | null
          id?: string
          interets?: string[] | null
          nb_voyageurs?: string | null
          notes_internes?: string | null
          prenom: string
          programme_genere?: string | null
          statut?: string | null
          telephone: string
        }
        Update: {
          budget?: string | null
          created_at?: string | null
          duree?: string | null
          email?: string
          extras?: Json | null
          id?: string
          interets?: string[] | null
          nb_voyageurs?: string | null
          notes_internes?: string | null
          prenom?: string
          programme_genere?: string | null
          statut?: string | null
          telephone?: string
        }
        Relationships: []
      }
      user_poles: {
        Row: {
          created_at: string
          pole: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pole: string
          user_id: string
        }
        Update: {
          created_at?: string
          pole?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_poles_pole_fkey"
            columns: ["pole"]
            isOneToOne: false
            referencedRelation: "content_poles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_poles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      whatsapp_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          done_token: string
          error: string | null
          id: string
          includes_manual_link: boolean
          notified_at: string | null
          photo_credit: string | null
          photo_source: string
          photo_url: string | null
          rejected_at: string | null
          rejection_reason: string | null
          scheduled_at: string
          section_id: string | null
          sent_at: string | null
          slot: string
          source_url: string | null
          status: string
          updated_at: string
          week_id: string | null
          zapi_message_id: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          done_token?: string
          error?: string | null
          id?: string
          includes_manual_link?: boolean
          notified_at?: string | null
          photo_credit?: string | null
          photo_source?: string
          photo_url?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_at: string
          section_id?: string | null
          sent_at?: string | null
          slot: string
          source_url?: string | null
          status?: string
          updated_at?: string
          week_id?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          done_token?: string
          error?: string | null
          id?: string
          includes_manual_link?: boolean
          notified_at?: string | null
          photo_credit?: string | null
          photo_source?: string
          photo_url?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          scheduled_at?: string
          section_id?: string | null
          sent_at?: string | null
          slot?: string
          source_url?: string | null
          status?: string
          updated_at?: string
          week_id?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_posts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_posts_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          admin_phone: string | null
          auto_validate: boolean
          daily_post_cap: number
          group_id: string | null
          id: number
          launch_date: string | null
          manual_url: string
          max_manual_links_per_week: number
          sender_phone: string | null
          test_group_id: string | null
          updated_at: string
          use_test_group: boolean
          validation_token: string
          validation_url: string | null
          zapi_instance_id: string | null
        }
        Insert: {
          admin_phone?: string | null
          auto_validate?: boolean
          daily_post_cap?: number
          group_id?: string | null
          id?: number
          launch_date?: string | null
          manual_url?: string
          max_manual_links_per_week?: number
          sender_phone?: string | null
          test_group_id?: string | null
          updated_at?: string
          use_test_group?: boolean
          validation_token?: string
          validation_url?: string | null
          zapi_instance_id?: string | null
        }
        Update: {
          admin_phone?: string | null
          auto_validate?: boolean
          daily_post_cap?: number
          group_id?: string | null
          id?: number
          launch_date?: string | null
          manual_url?: string
          max_manual_links_per_week?: number
          sender_phone?: string | null
          test_group_id?: string | null
          updated_at?: string
          use_test_group?: boolean
          validation_token?: string
          validation_url?: string | null
          zapi_instance_id?: string | null
        }
        Relationships: []
      }
      whatsapp_weeks: {
        Row: {
          answer_raw: string | null
          created_at: string
          id: string
          questions: string | null
          status: string
          suggestions: Json | null
          updated_at: string
          week_start: string
        }
        Insert: {
          answer_raw?: string | null
          created_at?: string
          id?: string
          questions?: string | null
          status?: string
          suggestions?: Json | null
          updated_at?: string
          week_start: string
        }
        Update: {
          answer_raw?: string | null
          created_at?: string
          id?: string
          questions?: string | null
          status?: string
          suggestions?: Json | null
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      cm_agent_notes: {
        Row: {
          agent: string | null
          created_at: string | null
          id: string | null
          summary: string | null
        }
        Insert: {
          agent?: string | null
          created_at?: string | null
          id?: string | null
          summary?: string | null
        }
        Update: {
          agent?: string | null
          created_at?: string | null
          id?: string | null
          summary?: string | null
        }
        Relationships: []
      }
      cm_event_sales_daily: {
        Row: {
          channel: string | null
          day: string | null
          event_id: string | null
          tickets: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_event_tracking: {
        Row: {
          event_id: string | null
          label: string | null
          last_sale: string | null
          tickets: number | null
          url: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tracking_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tracking_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_events: {
        Row: {
          capacity: number | null
          currency: string | null
          door_price: number | null
          edition: string | null
          ends_at: string | null
          id: string | null
          name: string | null
          neighborhood: string | null
          presale_target: number | null
          starts_at: string | null
          status: string | null
          venue: string | null
        }
        Insert: {
          capacity?: number | null
          currency?: string | null
          door_price?: number | null
          edition?: string | null
          ends_at?: string | null
          id?: string | null
          name?: string | null
          neighborhood?: string | null
          presale_target?: number | null
          starts_at?: string | null
          status?: string | null
          venue?: string | null
        }
        Update: {
          capacity?: number | null
          currency?: string | null
          door_price?: number | null
          edition?: string | null
          ends_at?: string | null
          id?: string | null
          name?: string | null
          neighborhood?: string | null
          presale_target?: number | null
          starts_at?: string | null
          status?: string | null
          venue?: string | null
        }
        Relationships: []
      }
      event_tracking_stats: {
        Row: {
          event_id: string | null
          label: string | null
          last_sale: string | null
          partner_id: string | null
          tickets: number | null
          url: string | null
          utm_source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tracking_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "cm_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tracking_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tracking_links_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      v_task_recipients: {
        Row: {
          client_id: string | null
          email: string | null
          instagram: string | null
          phone: string | null
          prospect_id: string | null
          recipient_name: string | null
          recipient_type: string | null
          task_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ask_rafael: {
        Args: {
          p_details?: string
          p_event_id?: string
          p_needed_by?: string
          p_subject: string
        }
        Returns: string
      }
      audience_breakdown: {
        Args: never
        Returns: {
          dimension: string
          n: number
          value: string
        }[]
      }
      blog_topic_choose: { Args: { p_token: string }; Returns: string }
      can_edit_content: { Args: { _user_id: string }; Returns: boolean }
      can_manage: { Args: { _user_id: string }; Returns: boolean }
      can_review_content: { Args: { _user_id: string }; Returns: boolean }
      capture_public_lead: { Args: { p_payload: Json }; Returns: string }
      cm_brief_text: {
        Args: { _day: string; _user_id: string }
        Returns: string
      }
      cm_channels: { Args: { _user_id: string }; Returns: string[] }
      cm_has_pole: {
        Args: { _pole: string; _user_id: string }
        Returns: boolean
      }
      cm_people_for_channel: {
        Args: { _channel: string }
        Returns: {
          person: string
          user_id: string
        }[]
      }
      convert_accepted_quote_to_trip: {
        Args: { p_quote_id: string }
        Returns: string
      }
      convert_prospect_to_client: {
        Args: { p_prospect_id: string }
        Returns: string
      }
      convert_quote_to_invoice: {
        Args: { p_quote_id: string }
        Returns: string
      }
      editorial_item_done: { Args: { p_token: string }; Returns: string }
      ensure_tracking_links: { Args: { p_event: string }; Returns: number }
      get_current_hub_user: { Args: never; Returns: Json }
      get_hub_user_by_auth_uid: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ig_daily_report: { Args: never; Returns: undefined }
      ig_ingest: { Args: { p_account: string; p_items: Json }; Returns: Json }
      ig_kind: {
        Args: { p_media_type: string; p_product: string }
        Returns: string
      }
      ig_match: { Args: { p_media_id: string }; Returns: string }
      ig_words: { Args: { t: string }; Returns: string[] }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_cm: { Args: { _user_id: string }; Returns: boolean }
      lili_brief_text: {
        Args: { d?: string; with_kits?: boolean }
        Returns: string
      }
      morning_brief_text: { Args: never; Returns: string }
      my_guide_trips: {
        Args: never
        Returns: {
          client_first_name: string
          end_date: string
          id: string
          itinerary: Json
          notes: string
          party_size: number
          reference: string
          start_date: string
          status: string
          title: string
        }[]
      }
      my_short_name: { Args: never; Returns: string }
      next_invoice_number: { Args: never; Returns: string }
      next_quote_number: { Args: never; Returns: string }
      next_trip_reference: { Args: { p_year?: number }; Returns: string }
      notify_rafael: { Args: { msg: string }; Returns: number }
      notify_whatsapp: {
        Args: { msg: string; person: string }
        Returns: number
      }
      person_key: { Args: { _user_id: string }; Returns: string }
      push_editorial_reminders: { Args: never; Returns: number }
      push_next_whatsapp_post: { Args: never; Returns: string }
      quote_refresh_paid_status: {
        Args: { p_quote_id: string }
        Returns: undefined
      }
      send_cm_briefs: { Args: never; Returns: string }
      send_daily_brief: { Args: never; Returns: string }
      send_lili_brief: { Args: never; Returns: string }
      set_sale_commission_paid: {
        Args: { p_paid: boolean; p_sale_id: string }
        Returns: string
      }
      slugify: { Args: { t: string }; Returns: string }
      submit_partner_application: { Args: { p: Json }; Returns: string }
      ticketing_eur_brl: { Args: never; Returns: number }
      ticketing_fire: {
        Args: {
          p_channel: string
          p_event: string
          p_kind: string
          p_url: string
        }
        Returns: undefined
      }
      ticketing_process: {
        Args: { r: Database["public"]["Tables"]["ticket_sync_requests"]["Row"] }
        Returns: undefined
      }
      ticketing_snapshot: { Args: { p_event: string }; Returns: undefined }
      ticketing_sync: { Args: never; Returns: undefined }
      urlencode: { Args: { t: string }; Returns: string }
      whatsapp_apply_action: {
        Args: {
          p_action: string
          p_date?: string
          p_post?: string
          p_reason?: string
          p_token: string
        }
        Returns: string
      }
      whatsapp_insert_day_plan: {
        Args: { p_raw: string; p_section_id?: string }
        Returns: Json
      }
      whatsapp_mark_result: {
        Args: {
          p_error?: string
          p_http_status: number
          p_id: string
          p_message_id?: string
        }
        Returns: string
      }
      whatsapp_next_due_post: { Args: { p_meteo?: string }; Returns: Json }
      whatsapp_post_done: { Args: { p_token: string }; Returns: string }
      whatsapp_research_context: { Args: never; Returns: Json }
      whatsapp_save_day_plan: {
        Args: { p_raw: string; p_section_id?: string }
        Returns: Json
      }
      whatsapp_validation_deadline: {
        Args: { p_scheduled_at: string }
        Returns: string
      }
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
        | "community_manager"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
        "community_manager",
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
