'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutDashboard, FileText, Upload, FolderKanban, Tags, PieChart, LogOut, Download, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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

interface SCAPayment {
  id: string;
  cheque_date: string;
  invoice_1: number;
  invoice_2: number;
  invoice_3: number;
  invoice_4: number;
  total_gross: number;
  status: string;
}

export default function SummaryPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scaPayments, setScaPayments] = useState<SCAPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // For Hydration Safety
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
    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .select(`
        *,
        projects (name)
      `)
      .order('date', { ascending: false });

    if (!expError && expData) {
      const formattedExpenses = expData.map((exp: any) => ({
        ...exp,
        project_name: exp.projects?.name || 'Unknown Project'
      }));
      setExpenses(formattedExpenses);
    }

    // Fetch SCA Payments (Assuming table exists)
    const { data: scaData, error: scaError } = await supabase
      .from('sca_payments')
      .select('*')
      .order('cheque_date', { ascending: false });
    
    if (!scaError && scaData) {
      setScaPayments(scaData);
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

  // --- EXPORT FUNCTIONS FOR SUMMARY PAGE ---

  const handleExportSummaryExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Category Summary
    const catData = [
      ["Category", "Total Amount"],
      ...categorySummary.map(c => [c.category, c.total])
    ];
    const wsCat = XLSX.utils.aoa_to_sheet(catData);
    XLSX.utils.book_append_sheet(wb, wsCat, "Category Summary");

    // Sheet 2: Project Summary
    const projData = [
      ["Project", "Total Amount"],
      ...projectSummary.map(p => [p.project, p.total])
    ];
    const wsProj = XLSX.utils.aoa_to_sheet(projData);
    XLSX.utils.book_append_sheet(wb, wsProj, "Project Summary");

    // Sheet 3: SCA Details
    const scaData = [
      ["Cheque Date", "Inv 1", "Inv 2", "Inv 3", "Inv 4", "Total Gross", "Status"],
      ...scaPayments.map(s => [
        s.cheque_date,
        s.invoice_1,
        s.invoice_2,
        s.invoice_3,
        s.invoice_4,
        s.total_gross,
        s.status
      ])
    ];
    const wsSca = XLSX.utils.aoa_to_sheet(scaData);
    XLSX.utils.book_append_sheet(wb, wsSca, "SCA Payments");

    XLSX.writeFile(wb, `Summary_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportSummaryPDF = () => {
    const doc = new jsPDF();
    doc.text("MMP Expenses - Summary Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${currentDateStr}`, 14, 22);

    // Category Summary
    doc.text("Category Wise Summary", 14, 30);
    autoTable(doc, {
      head: [["Category", "Total Amount"]],
      body: categorySummary.map(c => [c.category, c.total]),
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // Project Summary
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("Project Wise Summary", 14, finalY);
    autoTable(doc, {
      head: [["Project", "Total Amount"]],
      body: projectSummary.map(p => [p.project, p.total]),
      startY: finalY + 5,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    // SCA Details
    finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text("SCA Payment Details", 14, finalY);
    autoTable(doc, {
      head: [["Cheque Date", "Inv 1", "Inv 2", "Inv 3", "Inv 4", "Total Gross", "Status"]],
      body: scaPayments.map(s => [
        s.cheque_date,
        s.invoice_1,
        s.invoice_2,
        s.invoice_3,
        s.invoice_4,
        s.total_gross,
        s.status
      ]),
      startY: finalY + 5,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Summary Report</h1>
            <p className="text-slate-500">Overview of expenses by category, project, and SCA details.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportSummaryExcel} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={handleExportSummaryPDF} variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
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

            <div className="grid md:grid-cols-2 gap-6 mb-6">
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
                  <CardTitle>Project Wise Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectSummary.length === 0 ? (
                         <TableRow><TableCell colSpan={2} className="text-center py-4 text-slate-500">No data available.</TableCell></TableRow>
                      ) : (
                        projectSummary.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.project}</TableCell>
                            <TableCell className="text-right font-mono">{item.total.toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* SCA Details Section */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>SCA Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cheque Date</TableHead>
                      <TableHead className="text-right">Inv 1</TableHead>
                      <TableHead className="text-right">Inv 2</TableHead>
                      <TableHead className="text-right">Inv 3</TableHead>
                      <TableHead className="text-right">Inv 4</TableHead>
                      <TableHead className="text-right">Total Gross</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scaPayments.length === 0 ? (
                       <TableRow><TableCell colSpan={7} className="text-center py-4 text-slate-500">No SCA payments found.</TableCell></TableRow>
                    ) : (
                      scaPayments.map((sca, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{sca.cheque_date}</TableCell>
                          <TableCell className="text-right font-mono">{sca.invoice_1.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{sca.invoice_2.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{sca.invoice_3.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{sca.invoice_4.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold font-mono">{sca.total_gross.toLocaleString()}</TableCell>
                          <TableCell>{sca.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>