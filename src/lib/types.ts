// Hand-written domain models for the Supabase-backed tables this app reads
// and writes. There's no generated Database type (no Supabase CLI config or
// schema introspection in this repo — see supabase/migrations/ for the
// checked-in SQL source of truth), so these are kept in sync by hand.

export type DailyWaterRow = {
  user_id: string;
  date: string;
  water_ml: number;
};

export type UserPairRow = {
  user_a_id: string;
  user_b_id: string;
};

export type WeeklyResultRow = {
  week_start: string;
  week_end: string;
  user_a_id: string;
  user_b_id: string;
  user_a_total: number | null;
  user_b_total: number | null;
  winner: string | null;
};

export type MonthlyResultRow = {
  month_start: string;
  month_end: string;
  user_a_id: string;
  user_b_id: string;
  user_a_wins: number | null;
  user_b_wins: number | null;
  winner: string | null;
};

export type Theme = "calm" | "focused" | "bold";

export type UserPreferencesRow = {
  user_id: string;
  daily_reminder: boolean;
  partner_reminder: boolean;
  avatar_url: string | null;
  theme: Theme;
};

export type WishRow = {
  month_start: string;
  month_end: string;
  user_id: string;
  partner_id: string;
  wish_text: string;
};
