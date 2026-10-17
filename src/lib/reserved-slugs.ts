// Keep in sync with supabase/migrations/202610170001_store_profiles_and_reserved_slugs.sql
export const RESERVED_SLUGS = new Set([
  "www", "app", "admin", "api", "mail", "support", "auth", "dashboard", "onboarding", "store", "stores",
  "login", "register", "signin", "signup", "static", "assets", "cdn", "docs", "help", "status", "blog",
  "billing", "root", "ftp", "smtp", "imap", "pop", "ns1", "ns2", "dev", "staging", "test",
]);
