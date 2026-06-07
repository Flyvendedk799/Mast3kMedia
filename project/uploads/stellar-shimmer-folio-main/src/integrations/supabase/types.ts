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
      about_content: {
        Row: {
          bio: string
          created_at: string
          id: string
          profile_image_url: string | null
          skills: Json
          updated_at: string
        }
        Insert: {
          bio?: string
          created_at?: string
          id?: string
          profile_image_url?: string | null
          skills?: Json
          updated_at?: string
        }
        Update: {
          bio?: string
          created_at?: string
          id?: string
          profile_image_url?: string | null
          skills?: Json
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          content: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      experiences: {
        Row: {
          company: string
          created_at: string
          description: string
          display_order: number
          id: string
          period: string
          role: string
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          period: string
          role: string
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          period?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          awards: Json
          before_after: Json
          budget: Json
          case_study: Json
          category: string
          created_at: string
          deliverables: Json
          description: string
          display_order: number
          downloads: Json
          faq: Json
          featured: boolean
          gallery_images: string[]
          github_url: string | null
          hero_video_url: string | null
          id: string
          key_features: Json
          live_demo_url: string | null
          metrics: Json
          pinned: boolean
          press_links: Json
          preview_urls: string[]
          process_gallery: Json
          related_project_ids: string[]
          short_description: string
          status: string
          team: Json
          tech_rationale: Json
          tech_stack: string[]
          testimonials: Json
          thumbnail_url: string | null
          timeline: Json
          title: string
          updated_at: string
          video_urls: string[]
        }
        Insert: {
          awards?: Json
          before_after?: Json
          budget?: Json
          case_study?: Json
          category?: string
          created_at?: string
          deliverables?: Json
          description?: string
          display_order?: number
          downloads?: Json
          faq?: Json
          featured?: boolean
          gallery_images?: string[]
          github_url?: string | null
          hero_video_url?: string | null
          id?: string
          key_features?: Json
          live_demo_url?: string | null
          metrics?: Json
          pinned?: boolean
          press_links?: Json
          preview_urls?: string[]
          process_gallery?: Json
          related_project_ids?: string[]
          short_description?: string
          status?: string
          team?: Json
          tech_rationale?: Json
          tech_stack?: string[]
          testimonials?: Json
          thumbnail_url?: string | null
          timeline?: Json
          title: string
          updated_at?: string
          video_urls?: string[]
        }
        Update: {
          awards?: Json
          before_after?: Json
          budget?: Json
          case_study?: Json
          category?: string
          created_at?: string
          deliverables?: Json
          description?: string
          display_order?: number
          downloads?: Json
          faq?: Json
          featured?: boolean
          gallery_images?: string[]
          github_url?: string | null
          hero_video_url?: string | null
          id?: string
          key_features?: Json
          live_demo_url?: string | null
          metrics?: Json
          pinned?: boolean
          press_links?: Json
          preview_urls?: string[]
          process_gallery?: Json
          related_project_ids?: string[]
          short_description?: string
          status?: string
          team?: Json
          tech_rationale?: Json
          tech_stack?: string[]
          testimonials?: Json
          thumbnail_url?: string | null
          timeline?: Json
          title?: string
          updated_at?: string
          video_urls?: string[]
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          default_projects_sort: string
          default_projects_view: string
          id: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_projects_sort?: string
          default_projects_view?: string
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_projects_sort?: string
          default_projects_view?: string
          id?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          email: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          twitter_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          twitter_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          twitter_url?: string | null
          updated_at?: string
        }
        Relationships: []
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
