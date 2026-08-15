'use server'

import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { addDeletedItem } from '@/lib/services/deleted-items-store'

const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export async function deleteIncident(id: string) {
  try {
    addDeletedItem(id)
    
    if (isUuid(id)) {
      const supabaseAdmin = getSupabaseAdminClient()
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
      const supabaseAdmin = getSupabaseAdminClient()
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

