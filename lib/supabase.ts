import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export interface License {
  id: string
  license_key: string
  expires_at: string
  is_active: boolean
  created_at: string
  name: string | null
  phone: string | null
}
