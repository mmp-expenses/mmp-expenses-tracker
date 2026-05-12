'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Filter, LayoutDashboard, Upload, FolderKanban, Tags, PieChart, LogOut } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export default function ReportsPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'summary' | 'matrix'>('transactions');
  
  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // For Hydration Safety (Date display)
  const [currentDateStr, setCurrentDateStr] = useState('');

  const supabase = createClient();

  // Set current date on client side only to avoid hydration mismatch
  useEffect(() => {
    setCurrentDateStr(new Date().toLocaleDateString());
  }, []);

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

  // Filtered Expenses based on Date
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (!fromDate && !toDate) return true;
      const expDate = new Date(exp.date);
      const start = fromDate ? new Date(fromDate) : new Date('1900-01-01');
      const end = toDate ? new Date(toDate) : new Date('2099-12-31');
      return expDate >= start && expDate <= end;
    });
  }, [expenses, fromDate, toDate]);

  // Calculate Category Summary
  const categorySummary = useMemo(() => {
    const summary: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      summary[exp.category] = (summary[exp.category] || 0) + exp.amount;
    });
    return Object.entries(summary)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  // Calculate Consolidated Matrix (Project vs Category)
  const consolidatedMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();

    filteredExpenses.forEach(exp => {
      categories.add(exp.category);
      if (!matrix[exp.project_id]) matrix[exp.project_id] = {};
      matrix[exp.project_id][exp.category] = (matrix[exp.project_id][exp.category] || 0) + exp.amount;
    });

    // Convert to array format for rendering
    return Array.from(categories).sort().map(cat => {
      const row: any = { category: cat };
      let total = 0;
      projects.forEach(p => {
        const val = matrix[p.id]?.[cat] || 0;
        row[p.id] = val;
        total += val;
      });
      row.total = total;
      return row;
    });
  }, [filteredExpenses, projects]);

  // --- EXPORT FUNCTIONS ---

  const handleExportExcel = () => {
    let dataToExport: any[] = [];
    let fileName = "Report";

    if (activeTab === 'matrix') {
      // Export Consolidated Matrix ONLY
      const headers = ["Category", ...projects.map(p => p.name), "Total"];
      const rows = consolidatedMatrix.map(row => [
        row.category,
        ...projects.map(p => row[p.id] || 0),
        row.total
      ]);
      dataToExport = [headers, ...rows];
      fileName = "Consolidated_Matrix_Report";
    } else if (activeTab === 'summary') {
      // Export Category Summary ONLY
      dataToExport = [
        ["Category", "Total Amount"],
        ...categorySummary.map(c => [c.category, c.total])
      ];
      fileName = "Category_Summary";
    } else {
      // Export All Transactions ONLY
      dataToExport = [
        ["Date", "Project", "Category", "Description", "Amount"],
        ...filteredExpenses.map(e => [
          e.date,
          e.project_name,
          e.category,
          e.description,
          e.amount
        ])
      ];
      fileName = "All_Transactions";
    }

    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("MMP Expenses - Financial Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${currentDateStr}`, 14, 22);

    let head: any[][] = [];
    let body: any[][] = [];
    let title = "";

    if (activeTab === 'matrix') {
      title = "Consolidated Matrix (Project vs Category)";
      head = [["Category", ...projects.map(p => p.name), "Total"]];
      body = consolidatedMatrix.map(row => [
        row.category,
        ...projects.map(p => row[p.id] || 0),
        row.total
      ]);
    } else if (activeTab === 'summary') {
      title = "Category Wise Summary";
      head = [["Category", "Total Amount"]];
      body = categorySummary.map(c => [c.category, c.total]);
    } else {
      title = "All Transactions";
      head = [["Date", "Project", "Category", "Description", "Amount"]];
      body = filteredExpenses.map(e => [
        e.date,
        e.project_name,
        e.category,
        e.description,
        e.amount
      ]);
    }

    doc.text(title, 14, 30);
    autoTable(doc, {
      head: head,
      body: body,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8, overflow: 'linebreak' },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 240, 240] }
    });

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

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
          <Link href="/reports" className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium transition-colors"><FileText className="h-4 w-4" /> Expenses</Link>
          <Link href="/upload" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Upload className="h-4 w-4" /> Upload Excel</Link>
          <Link href="/projects" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><FolderKanban className="h-4 w-4" /> Projects</Link>
          <Link href="/categories" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><Tags className="h-4 w-4" /> Categories</Link>
          <Link href="/summary" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"><PieChart className="h-4 w-4" /> Summary Report</Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
           <Button variant="outline" className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
            <p className="text-slate-500">Detailed transactions and summaries.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportExcel} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={handleExportPDF} variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="pt-6 flex flex-wrap gap-4 items-end">
            <div className="grid gap-2">
              <Label>From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-[180px]" />
            </div>
            <div className="grid gap-2">
              <Label>To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-[180px]" />
            </div>
            <Button variant="secondary">
              <Filter className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            All Transactions
          </button>
          <button 
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'summary' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Category Summary
          </button>
          <button 
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 font-medium transition-colors ${activeTab === 'matrix' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Consolidated Matrix
          </button>
        </div>

        {/* Content */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-10 text-slate-500">Loading financial data...</div>
            ) : (
              <>
                {activeTab === 'transactions' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredExpenses.length === 0 ? (
                           <TableRow><TableCell colSpan={5} className="text-center py-4 text-slate-500">No transactions found.</TableCell></TableRow>
                        ) : (
                          filteredExpenses.map((exp) => (
                            <TableRow key={exp.id}>
                              <TableCell>{exp.date}</TableCell>
                              <TableCell>{exp.project_name}</TableCell>
                              <TableCell>{exp.category}</TableCell>
                              <TableCell>{exp.description}</TableCell>
                              <TableCell className="text-right font-mono">{exp.amount.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {activeTab === 'summary' && (
                  <div className="overflow-x-auto">
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
                  </div>
                )}

                {activeTab === 'matrix' && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px] sticky left-0 bg-white z-10">Category \ Project</TableHead>
                          {projects.map(p => (
                            <TableHead key={p.id} className="text-right min-w-[120px]">{p.name}</TableHead>
                          ))}
                          <TableHead className="text-right font-bold bg-slate-50">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consolidatedMatrix.length === 0 ? (
                           <TableRow><TableCell colSpan={projects.length + 2} className="text-center py-4 text-slate-500">No data available for matrix.</TableCell></TableRow>
                        ) : (
                          consolidatedMatrix.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium sticky left-0 bg-white z-10">{row.category}</TableCell>
                              {projects.map(p => (
                                <TableCell key={p.id} className="text-right font-mono">
                                  {row[p.id] ? row[p.id].toLocaleString() : '-'}
                                </TableCell>
                              ))}
                              <TableCell className="text-right font-bold font-mono bg-slate-50">{row.total.toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}