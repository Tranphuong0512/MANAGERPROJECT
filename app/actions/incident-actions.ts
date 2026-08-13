'use server'

import { createClient } from '@supabase/supabase-js'
import { addDeletedItem } from '@/lib/services/deleted-items-store'

// Bypass RLS to allow deleting incidents and improvements
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export async function deleteIncident(id: string) {
  try {
    addDeletedItem(id)
    
    if (isUuid(id)) {
      const { error } = await supabaseAdmin
        .from('incidents')
        .delete()
        .eq('id', id)
        
      if (error) throw error
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteImprovement(id: string) {
  try {
    addDeletedItem(id)
    
    if (isUuid(id)) {
      const { error } = await supabaseAdmin
        .from('improvements')
        .delete()
        .eq('id', id)
        
      if (error) throw error
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

