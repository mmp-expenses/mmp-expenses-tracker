import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = params;
  const { status } = await req.json();

  // 1. Get current user and role
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // 2. Fetch current expense
  const { data: expense } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (!expense) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  // 3. Check Lock Logic
  if (expense.status === 'completed') {
    // If already completed, only Admin can unlock
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Entry is locked. Only Admin can modify.' }, { status: 403 });
    }
  }

  // 4. Update
  const updateData: any = { status };
  if (status === 'completed') {
    updateData.locked_at = new Date().toISOString();
  } else {
    updateData.locked_at = null;
  }

  const { error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 5. Log Audit
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: status === 'completed' ? 'LOCK' : 'UNLOCK',
    table_name: 'expenses',
    record_id: id,
    new_values: updateData
  });

  return NextResponse.json({ success: true });
}