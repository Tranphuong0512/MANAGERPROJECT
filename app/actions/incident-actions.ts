'use server'

import { createClient } from '@supabase/supabase-js'

// Bypass RLS to allow deleting incidents and improvements
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function deleteIncident(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('incidents')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteImprovement(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('improvements')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
