// ログインとお気に入りの保存先（Supabase）。
// VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY が無いときは null になり、
// サイトはログインなしの閲覧だけで動く。
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;
