//import mysql from "mysql2/promise";

// const pool = mysql.createPool({
//   host: process.env.DB_HOST || "localhost",
//   port: parseInt(process.env.DB_PORT || "3307"),
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASSWORD || "",
//   database: process.env.DB_NAME || "bobtester",
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import ws from "ws";

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws as any },
});

export default supabase;
