/**
 * Cloudflare Worker & D1 Type Definitions for Phoenix Labs Academy
 */

export type Bindings = {
  DB?: D1Database;
  ASSETS: Fetcher;
  ADMIN_EMAILS?: string;
  ADMIN_API_TOKEN?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
};

export type Variables = {
  studentId: string;
  studentEmail: string;
  displayName: string;
  zeroTrustEnforced: boolean;
  isAdmin: boolean;
};

export interface TrackRecord {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  order_index: number;
}

export interface ModuleRecord {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  difficulty: 'Fundamentals' | 'Intermediate' | 'Advanced';
  order_index: number;
  estimated_minutes: number;
  theory_json: string;
  lab_type: 'terminal' | 'siem' | 'hex_inspector' | 'quiz';
  lab_briefing: string;
  lab_config_json: string;
  expected_flag: string;
  hint: string;
  status?: 'not_started' | 'in_progress' | 'completed';
  attempts?: number;
  time_spent_seconds?: number;
  completed_at?: string | null;
}

export interface StudentRecord {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  last_active_at: string;
}

export interface IngestModulePayload {
  id: string;
  track_id: string;
  slug: string;
  title: string;
  difficulty: 'Fundamentals' | 'Intermediate' | 'Advanced';
  order_index?: number;
  estimated_minutes?: number;
  theory_sections?: Array<{ heading: string; body: string }>;
  lab_type: 'terminal' | 'siem' | 'hex_inspector' | 'quiz';
  lab_briefing: string;
  lab_config: Record<string, unknown>;
  expected_flag: string;
  hint?: string;
}

export interface IngestCourseBundlePayload {
  track?: TrackRecord;
  tracks?: TrackRecord[];
  modules: IngestModulePayload[];
}
