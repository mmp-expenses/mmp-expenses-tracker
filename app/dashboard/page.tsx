'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  FolderKanban, 
  Tags, 
  BarChart3, 
  PieChart, 
  LogOut,
  DollarSign,
  TrendingUp,
  Activity
} from 'lucide-react';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchRecentData();
  }, []);

  const fetchRecentData = async () => {
    setLoading(true);
    // Fetch last 5 transactions
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .limit(5);

    if (!error && data) {
      setTransactions(data);
      
      // Calculate Total Expenses (Simple sum of all fetched for demo, ideally fetch all or aggregate)
      // For accurate total, we should do a separate query or aggregate on DB side
      const { data: allData } = await supabase.from('expenses').select('amount');
      if(allData) {
          const total = allData.reduce((sum, item) => sum + (item.amount || 0), 0);
          setTotalExpenses(total);
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r hidden md:block fixed h-full z-10">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            MMP Expenses
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
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
          <Link href="/reports" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <BarChart3 className="h-4 w-4" /> Reports
          </Link>
          <Link href="/summary" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
            <PieChart className="h-4 w-4" /> Summary Report
          </Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
           <Button variant="outline" className="w-full justify-start gap-2" onClick={() => supabase.auth.signOut()}>
             <LogOut className="h-4 w-4" /> Logout
           </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">JIAP-ATC Accounting System</h2>
            <p className="text-slate-500">Welcome back, Muhammad Ali</p>
          </div>
          <div className="flex items-center gap-4">
             {/* User Profile Placeholder */}
             <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                MA
             </div>
          </div>
        </header>

        {/* Dashboard Title */}
        <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Overview of financial activities.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Grand Total Expenses</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">PKR {totalExpenses.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">All Projects Combined</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Expense Trends</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">Active</div>
                    <p className="text-xs text-muted-foreground">Tracking enabled</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Status</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">Online</div>
                    <p className="text-xs text-muted-foreground">Database connected</p>
                </CardContent>
            </Card>
        </div>

        {/* Recent Transactions Table */}
        <Card>
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <p className="text-sm text-muted-foreground">Last 5 entries</p>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount (PKR)</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">Loading data...</TableCell>
                            </TableRow>
                        ) : transactions.length > 0 ? (
                            transactions.map((t) => (
                                <TableRow key={t.id}>
                                    <TableCell>{t.date}</TableCell>
                                    <TableCell><Badge variant="secondary">{t.category}</Badge></TableCell>
                                    <TableCell className="max-w-xs truncate">{t.description}</TableCell>
                                    <TableCell className="text-right font-mono">{t.amount.toLocaleString()}</TableCell>
                                    <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No recent transactions found. Upload some expenses to see data here.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {/* FOOTER SECTION */}
        <footer className="mt-12 pt-6 border-t text-center">
            <p className="text-sm text-slate-500 font-medium">
                This Software is Designed & Developed by <span className="font-bold text-blue-600">SLM</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
                © {new Date().getFullYear()} All Rights Reserved.
            </p>
        </footer>

      </main>
    </div>
  );
}