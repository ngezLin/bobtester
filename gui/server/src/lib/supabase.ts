import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_SUPABASE_URL = "https://ezhbjigaumdvilsfkrzv.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6aGJqaWdhdW1kdmlsc2Zrcnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzUyOTksImV4cCI6MjEwNTIxMTI5OX0.LoeXq46b1pAU6ZADOdzwDOyh8iLg5U2r8YELt4Idu1k";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

if (supabaseUrl.includes("ntlxpidppjicgoikppmp") || !supabaseUrl) {
  supabaseUrl = DEFAULT_SUPABASE_URL;
  supabaseKey = DEFAULT_SUPABASE_KEY;
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  { realtime: { transport: ws as any } },
);
