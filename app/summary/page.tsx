'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, FileText, Upload, FolderKanban, Tags, PieChart, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Expense {
  id: string;
  date: string;
  project_id: string;
  project_name?: string;
  category: string;
  description: string;
  amount: number;
}

interface Project {
  id: string;
  name: string;
}

export default function SummaryPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Projects
    const { data: projData } = await supabase.from('projects').select('id, name');
    if (projData) setProjects(projData);

    // Fetch Expenses with Project Names
    const { data: expData, error } = await supabase
      .from('expenses')
      .select(`
        *,
        projects (name)
      `)
      .order('date', { ascending: false });

    if (!error && expData) {
      const formattedExpenses = expData.map((exp: any) => ({
        ...exp,
        project_name: exp.projects?.name || 'Unknown Project'
      }));
      setExpenses(formattedExpenses);
    }
    setLoading(false);
  };

  // Calculate Category Summary
  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    expenses.forEach(exp => {
      summary[exp.category] = (summary[exp.category] || 0) + exp.amount;
    });
    return Object.entries(summary)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Calculate Project Summary
  const projectSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    expenses.forEach(exp => {
      summary[exp.project_name || 'Unknown'] = (summary[exp.project_name || 'Unknown'] || 0) + exp.amount;
    });
    return Object.entries(summary)
      .map(([project, total]) => ({ project, total }))
      .sort((a, b) => b.total - a.total);
  }, [expenses]);

  // Calculate Grand Total
  const grandTotal = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r hidden md:block fixed h-full z-10 shadow-sm">
        <div className="p-6 border-b flex items-center gap-2">
           <PieChart className="h-6 w-6 text-blue-600" />
           <h1 className="text-xl font-bold text-slate-800">MMP Expenses</h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
          <Link href="/reports" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><FileText className="h-4 w-4" /> Expenses</Link>
          <Link href="/upload" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Upload className="h-4 w-4" /> Upload Excel</Link>
          <Link href="/projects" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><FolderKanban className="h-4 w-4" /> Projects</Link>
          <Link href="/categories" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Tags className="h-4 w-4" /> Categories</Link>
          <Link href="/summary" className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors"><PieChart className="h-4 w-4" /> Summary Report</Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
           <Button variant="outline" className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Summary Report</h1>
          <p className="text-slate-500">Overview of expenses by category and project.</p>
        </div>

        {loading ? (
          <Card className="shadow-sm mb-6">
            <CardContent className="pt-6 text-center py-10 text-slate-500">Loading summary data...</CardContent>
          </Card>
        ) : (
          <>
            {/* Grand Total Card */}
            <Card className="shadow-sm mb-6 border-l-4 border-blue-600">
              <CardHeader>
                <CardTitle className="text-slate-500 text-sm font-medium">Grand Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{grandTotal.toLocaleString()} PKR</div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Category Summary */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Category Wise Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categorySummary.length === 0 ? (
                         <TableRow><TableCell colSpan={2} className="text-center py-4 text-slate-500">No data available.</TableCell></TableRow>
                      ) : (
                        categorySummary.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.category}</TableCell>
                            <TableCell className="text-right font-mono">{item.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Project Summary */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Project Wise Summary</CardTitle