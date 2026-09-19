export const jwtSecret = process.env.JWT_SECRET ?? "";
export const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
export const databaseUrl = process.env.DATABASE_URL ?? "";
export const supabaseUrl = process.env.SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const scanPolicy = {
  maxPages: 30,
  maxDepth: 3,
  maxRequests: 120,
  pageTimeoutMs: 10000,
  crawlDelayMs: 250,
};

export const safeScanOptions = {
  allowedHeaders: [
    "content-security-policy",
    "strict-transport-security",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
    "permissions-policy",
  ],
};
