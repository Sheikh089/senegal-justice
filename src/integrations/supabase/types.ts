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
      activites: {
        Row: {
          action: string
          created_at: string
          details: string | null
          dossier_id: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          dossier_id: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          dossier_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activites_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          articles: Json
          created_at: string
          description: string
          dossier_id: string | null
          id: string
          lieu: string | null
          model: string
          prompt: string
          titre: string | null
          type_infraction: string | null
          user_id: string
          version: string
          warnings: Json
        }
        Insert: {
          articles?: Json
          created_at?: string
          description: string
          dossier_id?: string | null
          id?: string
          lieu?: string | null
          model: string
          prompt: string
          titre?: string | null
          type_infraction?: string | null
          user_id: string
          version?: string
          warnings?: Json
        }
        Update: {
          articles?: Json
          created_at?: string
          description?: string
          dossier_id?: string | null
          id?: string
          lieu?: string | null
          model?: string
          prompt?: string
          titre?: string | null
          type_infraction?: string | null
          user_id?: string
          version?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      audiences: {
        Row: {
          created_at: string
          date_audience: string
          dossier_id: string
          greffier_id: string | null
          id: string
          juge_id: string | null
          notes: string | null
          salle: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_audience: string
          dossier_id: string
          greffier_id?: string | null
          id?: string
          juge_id?: string | null
          notes?: string | null
          salle?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_audience?: string
          dossier_id?: string
          greffier_id?: string | null
          id?: string
          juge_id?: string | null
          notes?: string | null
          salle?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audiences_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      biometrics: {
        Row: {
          capture_source: string | null
          captured_at: string
          created_at: string
          created_by: string
          device_info: Json | null
          dossier_id: string | null
          finger: string
          hand: string | null
          id: string
          image_url: string
          notes: string | null
          quality: number | null
          suspect_id: string | null
          template: string | null
          template_algo: string | null
          template_encrypted: string | null
          template_hash: string | null
          template_iv: string | null
          updated_at: string
        }
        Insert: {
          capture_source?: string | null
          captured_at?: string
          created_at?: string
          created_by: string
          device_info?: Json | null
          dossier_id?: string | null
          finger: string
          hand?: string | null
          id?: string
          image_url: string
          notes?: string | null
          quality?: number | null
          suspect_id?: string | null
          template?: string | null
          template_algo?: string | null
          template_encrypted?: string | null
          template_hash?: string | null
          template_iv?: string | null
          updated_at?: string
        }
        Update: {
          capture_source?: string | null
          captured_at?: string
          created_at?: string
          created_by?: string
          device_info?: Json | null
          dossier_id?: string | null
          finger?: string
          hand?: string | null
          id?: string
          image_url?: string
          notes?: string | null
          quality?: number | null
          suspect_id?: string | null
          template?: string | null
          template_algo?: string | null
          template_encrypted?: string | null
          template_hash?: string | null
          template_iv?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometrics_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometrics_suspect_id_fkey"
            columns: ["suspect_id"]
            isOneToOne: false
            referencedRelation: "suspects"
            referencedColumns: ["id"]
          },
        ]
      }
      call_signals: {
        Row: {
          call_id: string
          call_kind: string
          created_at: string
          dossier_id: string
          from_user: string
          id: string
          payload: Json | null
          to_user: string
          type: string
        }
        Insert: {
          call_id: string
          call_kind?: string
          created_at?: string
          dossier_id: string
          from_user: string
          id?: string
          payload?: Json | null
          to_user: string
          type: string
        }
        Update: {
          call_id?: string
          call_kind?: string
          created_at?: string
          dossier_id?: string
          from_user?: string
          id?: string
          payload?: Json | null
          to_user?: string
          type?: string
        }
        Relationships: []
      }
      decisions: {
        Row: {
          created_at: string
          date_decision: string
          dossier_id: string
          id: string
          juge_id: string
          motivation: string | null
          peine: string | null
          updated_at: string
          verdict: string
        }
        Insert: {
          created_at?: string
          date_decision?: string
          dossier_id: string
          id?: string
          juge_id: string
          motivation?: string | null
          peine?: string | null
          updated_at?: string
          verdict: string
        }
        Update: {
          created_at?: string
          date_decision?: string
          dossier_id?: string
          id?: string
          juge_id?: string
          motivation?: string | null
          peine?: string | null
          updated_at?: string
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      dossiers: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          date_faits: string | null
          description: string | null
          id: string
          lieu: string | null
          mis_en_cause_adresse: string | null
          mis_en_cause_date_naissance: string | null
          mis_en_cause_empreinte_droite: string | null
          mis_en_cause_empreinte_gauche: string | null
          mis_en_cause_lieu_naissance: string | null
          mis_en_cause_nom: string | null
          mis_en_cause_photo_droite: string | null
          mis_en_cause_photo_face: string | null
          mis_en_cause_photo_gauche: string | null
          mis_en_cause_prenom: string | null
          mis_en_cause_profession: string | null
          mis_en_cause_telephone: string | null
          priority: string | null
          reference: string
          status: Database["public"]["Enums"]["dossier_status"]
          titre: string
          type_infraction: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          date_faits?: string | null
          description?: string | null
          id?: string
          lieu?: string | null
          mis_en_cause_adresse?: string | null
          mis_en_cause_date_naissance?: string | null
          mis_en_cause_empreinte_droite?: string | null
          mis_en_cause_empreinte_gauche?: string | null
          mis_en_cause_lieu_naissance?: string | null
          mis_en_cause_nom?: string | null
          mis_en_cause_photo_droite?: string | null
          mis_en_cause_photo_face?: string | null
          mis_en_cause_photo_gauche?: string | null
          mis_en_cause_prenom?: string | null
          mis_en_cause_profession?: string | null
          mis_en_cause_telephone?: string | null
          priority?: string | null
          reference: string
          status?: Database["public"]["Enums"]["dossier_status"]
          titre: string
          type_infraction?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          date_faits?: string | null
          description?: string | null
          id?: string
          lieu?: string | null
          mis_en_cause_adresse?: string | null
          mis_en_cause_date_naissance?: string | null
          mis_en_cause_empreinte_droite?: string | null
          mis_en_cause_empreinte_gauche?: string | null
          mis_en_cause_lieu_naissance?: string | null
          mis_en_cause_nom?: string | null
          mis_en_cause_photo_droite?: string | null
          mis_en_cause_photo_face?: string | null
          mis_en_cause_photo_gauche?: string | null
          mis_en_cause_prenom?: string | null
          mis_en_cause_profession?: string | null
          mis_en_cause_telephone?: string | null
          priority?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["dossier_status"]
          titre?: string
          type_infraction?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      fingerprint_matches: {
        Row: {
          biometric_id: string
          created_at: string
          id: string
          rank: number | null
          scan_id: string
          score: number
          suspect_id: string | null
        }
        Insert: {
          biometric_id: string
          created_at?: string
          id?: string
          rank?: number | null
          scan_id: string
          score: number
          suspect_id?: string | null
        }
        Update: {
          biometric_id?: string
          created_at?: string
          id?: string
          rank?: number | null
          scan_id?: string
          score?: number
          suspect_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fingerprint_matches_biometric_id_fkey"
            columns: ["biometric_id"]
            isOneToOne: false
            referencedRelation: "biometrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fingerprint_matches_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scan_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fingerprint_matches_suspect_id_fkey"
            columns: ["suspect_id"]
            isOneToOne: false
            referencedRelation: "suspects"
            referencedColumns: ["id"]
          },
        ]
      }
      investigations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          dossier_id: string | null
          id: string
          status: string
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          dossier_id?: string | null
          id?: string
          status?: string
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          dossier_id?: string | null
          id?: string
          status?: string
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investigations_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          dossier_id: string
          duration_ms: number | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          kind: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          dossier_id: string
          duration_ms?: number | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          dossier_id?: string
          duration_ms?: number | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          kind?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      pieces_jointes: {
        Row: {
          created_at: string
          dossier_id: string
          id: string
          nom: string
          type: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          dossier_id: string
          id?: string
          nom: string
          type?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          dossier_id?: string
          id?: string
          nom?: string
          type?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pieces_jointes_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          badge_number: string | null
          created_at: string
          department: string | null
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_number?: string | null
          created_at?: string
          department?: string | null
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_number?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scan_history: {
        Row: {
          created_at: string
          created_by: string
          dossier_id: string | null
          id: string
          investigation_id: string | null
          query_biometric_id: string | null
          query_image_url: string | null
          results_count: number
          status: string
          top_score: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          dossier_id?: string | null
          id?: string
          investigation_id?: string | null
          query_biometric_id?: string | null
          query_image_url?: string | null
          results_count?: number
          status?: string
          top_score?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dossier_id?: string | null
          id?: string
          investigation_id?: string | null
          query_biometric_id?: string | null
          query_image_url?: string | null
          results_count?: number
          status?: string
          top_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_history_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_history_investigation_id_fkey"
            columns: ["investigation_id"]
            isOneToOne: false
            referencedRelation: "investigations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_history_query_biometric_id_fkey"
            columns: ["query_biometric_id"]
            isOneToOne: false
            referencedRelation: "biometrics"
            referencedColumns: ["id"]
          },
        ]
      }
      suspects: {
        Row: {
          adresse: string | null
          alias: string | null
          created_at: string
          created_by: string
          date_naissance: string | null
          dossier_id: string | null
          id: string
          lieu_naissance: string | null
          nationalite: string | null
          nom: string
          photo_url: string | null
          prenom: string | null
          profession: string | null
          sexe: string | null
          signalement: string | null
          status: string
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          alias?: string | null
          created_at?: string
          created_by: string
          date_naissance?: string | null
          dossier_id?: string | null
          id?: string
          lieu_naissance?: string | null
          nationalite?: string | null
          nom: string
          photo_url?: string | null
          prenom?: string | null
          profession?: string | null
          sexe?: string | null
          signalement?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          alias?: string | null
          created_at?: string
          created_by?: string
          date_naissance?: string | null
          dossier_id?: string | null
          id?: string
          lieu_naissance?: string | null
          nationalite?: string | null
          nom?: string
          photo_url?: string | null
          prenom?: string | null
          profession?: string | null
          sexe?: string | null
          signalement?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suspects_dossier_id_fkey"
            columns: ["dossier_id"]
            isOneToOne: false
            referencedRelation: "dossiers"
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_dossier_access: {
        Args: { _dossier_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "police"
        | "procureur"
        | "juge"
        | "greffier"
        | "admin"
        | "assistant"
      dossier_status:
        | "nouveau"
        | "en_cours"
        | "transmis"
        | "audience_programmee"
        | "juge"
        | "classe"
        | "archive"
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
        "police",
        "procureur",
        "juge",
        "greffier",
        "admin",
        "assistant",
      ],
      dossier_status: [
        "nouveau",
        "en_cours",
        "transmis",
        "audience_programmee",
        "juge",
        "classe",
        "archive",
      ],
    },
  },
} as const
