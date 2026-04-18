export type RetailerRow = {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  /** Present only if the `retailers` table has a `city` column (optional in DB). */
  city?: string | null;
  /** Primary mobile (+91…) */
  contact_no: string | null;
  contact_person_name?: string | null;
  telephone?: string | null;
  alternative_phone?: string | null;
  gst_no: string | null;
  created_at: string;
  updated_at: string;
};
