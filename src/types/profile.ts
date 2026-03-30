export type ProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  user_metadata: Record<string, unknown>;
  welcome_tour_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
