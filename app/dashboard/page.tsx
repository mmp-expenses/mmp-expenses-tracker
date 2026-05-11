'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, LayoutDashboard, FileText, Upload, FolderKanban, Tags, BarChart3, PieChart, LogOut, TrendingUp, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  date: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  status: string;
}

export default function DashboardPage() {
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTotalExpenses();
  }, []);

  const fetchTotalExpenses = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('expenses').select('amount');
    
    if (!error && data) {
      const total = data.reduce((sum, item) => sum + (item.amount || 0), 0);
      setTotalExpenses(total);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r hidden md:block fixed h-full z-10 shadow-sm">
        <div className="p-6 border-b flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">MMP Expenses</h1>
        </div>
        
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
          <Link href="/reports" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <FileText className="h-4 w-4" /> Expenses
          </Link>
          <Link href="/upload" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <Upload className="h-4 w-4" /> Upload Excel
          </Link>
          <Link href="/projects" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <FolderKanban className="h-4 w-4" /> Projects
          </Link>
          <Link href="/categories" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <Tags className="h-4 w-4" /> Categories
          </Link>
          <Link href="/summary" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <PieChart className="h-4 w-4" /> Summary Report
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
           <Button variant="outline" className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" onClick={() => supabase.auth.signOut()}>
             <LogOut className="h-4 w-4" /> Logout
           </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* Header Section */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">JIAP-ATC Accounting System</h2>
            <p className="text-slate-500">Welcome back! Here is your financial overview.</p>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold shadow-sm">
             MA
          </div>
        </header>

        {/* Dashboard Title */}
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Overview of financial activities.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Grand Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">
                      {loading ? '...' : `PKR ${totalExpenses.toLocaleString()}`}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">All Projects Combined</p>
                </CardContent>
            </Card>
            
            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">Expense Trends</CardTitle>
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-slate-900">Active</div>
                    <p className="text-xs text-slate-500 mt-1">Tracking enabled for all categories</p>
                </CardContent>
            </Card>

            <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">System Status</CardTitle>
                    <Activity className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">Online</div>
                    <p className="text-xs text-slate-500 mt-1">Database connected successfully</p>
                </CardContent>
            </Card>
        </div>

        {/* Quick Actions / Info */}
        <Card className="shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
             <div className="p-4 border rounded-lg bg-slate-50">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Upload className="h-4 w-4 text-blue-600"/> Upload Data</h3>
                <p className="text-sm text-slate-500">Upload your SCA, Salary, or Rent Excel files to automatically populate the database.</p>
                <Link href="/upload"><Button variant="link" className="p-0 h-auto text-blue-600">Go to Upload &rarr;</Button></Link>
             </div>
             <div className="p-4 border rounded-lg bg-slate-50">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-purple-600"/> View Reports</h3>
                <p className="text-sm text-slate-500">Analyze your spending by category, project, or time period with detailed reports.</p>
                <Link href="/summary"><Button variant="link" className="p-0 h-auto text-purple-600">View Summary &rarr;</Button></Link>
             </div>
          </CardContent>
        </Card>

        {/* FOOTER SECTION */}
        <footer className="mt-12 pt-6 border-t text-center pb-8">
            <p className="text-sm text-slate-500 font-medium">
                This Software is Designed & Developed by <span className="font-bold text-blue-600">SLM</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
                © {new Date().getFullYear()} JIAP-ATC Accounting System. All Rights Reserved.
            </p>
        </footer>

      </main>
    </div>
  );
}