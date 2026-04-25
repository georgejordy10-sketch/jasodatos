export type AdminBusinessOverview = {
  id: string;
  slug: string;
  business_name: string;
  owner_email: string | null;
  owner_whatsapp: string | null;
  plan: "basic" | "pro" | "ultra";
  status: "active" | "trial" | "suspended" | "inactive";
  created_at: string;
  last_seen_at: string | null;
  billing_status: "manual" | "trial" | "active" | "past_due" | "canceled";
  users_count: number;
};