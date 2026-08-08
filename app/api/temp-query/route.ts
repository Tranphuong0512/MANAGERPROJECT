import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: cols } = await supabase.from('information_schema.columns').select('column_name, data_type').eq('table_name', 'staff');
  const { data: cols2 } = await supabase.from('information_schema.columns').select('column_name, data_type').eq('table_name', 'projects').eq('column_name', 'manager_id');
  return NextResponse.json({ staff: cols, projects: cols2 });
}
