'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  LogOut, 
  FolderKanban, 
  PieChart, 
  BarChart3,
  Tags // Icon for Categories
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/expenses', label: 'Expenses', icon: FileText },
    { href: '/upload', label: 'Upload Excel', icon: Upload },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/categories', label: 'Categories', icon: Tags }, // New Category Link
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/summary', label: 'Summary Report', icon: PieChart },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-slate-50/50 backdrop-blur-xl">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <FolderKanban className="h-6 w-6" />
          <span>MMP Expenses</span>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t bg-slate-50/50">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}