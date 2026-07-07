import { createClient } from "@supabase/supabase-js";

// Not parameterized with a generated `Database` type: this version of
// @supabase/supabase-js expects a schema shape keyed with internal markers
// that aren't documented, and only `supabase gen types typescript` (Supabase
// CLI against the live project) can produce that reliably. Application code
// uses the hand-written row shapes in `src/lib/types.ts` instead.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
