import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Vote {
  id: string
  option_id: number
  voter_ip?: string
  created_at: string
}

export interface VoteCount {
  option_id: number
  count: number
}