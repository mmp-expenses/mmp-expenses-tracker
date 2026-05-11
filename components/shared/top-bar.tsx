import { createClient } from '@/lib/supabase/server';
import { UserCircle } from 'lucide-react';

export async function TopBar() {
  const supabase = await createClient();
  
  // Fetch User and Profile Data
  const { data: { user } } = await supabase.auth.getUser();
  
  let fullName = 'User';
  
  if (user) {
    // Try to get full name from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name) {
      fullName = profile.full_name;
    } else {
      // Fallback to email username part if no name is set
      fullName = user.email?.split('@')[0] || 'User';
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-800">JIAP-ATC Accounting System</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-full border bg-white px-3 py-1.5 shadow-sm hover:bg-slate-50 transition-colors">
          <UserCircle className="h-5 w-5 text-slate-500" />
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-700 leading-none">{fullName}</span>
            {/* Optional: Show email in smaller text below name if needed */}
            {/* <span className="text-[10px] text-slate-400 leading-none">{user?.email}</span> */}
          </div>
        </div>
      </div>
    </header>
  );
}