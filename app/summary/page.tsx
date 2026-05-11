'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Transaction {
  id: string;
  date: string;
  project_id: string;
  category: string; // Company Name for SCA
  sub_category?: string; // 'SCA' tag
  description: string;
  amount: number; // Gross Amount
  status: string;
}

export default function SummaryPage() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  
  // Filter States
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // ULTRA-ROBUST Helper to extract SCA details from description string
  const extractSCADetails = (desc: string) => {
      const start = desc.indexOf('[');
      const end = desc.lastIndexOf(']');
      if (start === -1 || end === -1 || end <= start) {
          return { paid: 0, balance: 0, note: '', invoices: [] };
      }
      
      const details = desc.substring(start + 1, end);
      const parts = details.split('|');
      let paid = 0, balance = 0, note = '';
      let invoices: number[] = [];
      
      parts.forEach(part => {
          if (part.startsWith('PAID:')) paid = parseFloat(part.replace('PAID:', '').replace(/,/g, '')) || 0;
          else if (part.startsWith('BAL:')) balance = parseFloat(part.replace('BAL:', '').replace(/,/g, '')) || 0;
          else if (part.startsWith('NOTE:')) note = part.replace('NOTE:', '').trim();
          else if (part.startsWith('INVS:[')) {
              const invContent = part.substring(6, part.length - 1);
              if (invContent) {
                  invoices = invContent.split(',').map(v => {
                      const num = parseFloat(v.trim().replace(/[^0-9.-]/g, ''));
                      return isNaN(num) ? 0 : num;
                  }).filter(n => n !== 0);
              }
          }
      });
      
      return { paid, balance, note, invoices };
  };

  const fetchTransactions = async () => {
    setLoading(true);
    // Fetch ALL expenses initially
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    
    if (!error && data) {
        setAllTransactions(data as Transaction[]);
        setFilteredTransactions(data as Transaction[]); // Initially show all
    }
    setLoading(false);
  };

  useEffect(() => { 
      fetchTransactions(); 
  }, []); 

  // Apply Filters whenever dates change
  useEffect(() => {
      let result = allTransactions;

      if (fromDate) {
          result = result.filter(t => t.date >= fromDate);
      }
      if (toDate) {
          result = result.filter(t => t.date <= toDate);
      }

      setFilteredTransactions(result);
  }, [fromDate, toDate, allTransactions]);

  // --- EXPORT FUNCTIONS (Export Filtered Data) ---

  const handleExportToExcel = () => {
    const exportData = filteredTransactions.map(t => ({
      Date: t.date,
      Project: t.project_id,
      Category: t.category,
      Description: t.description,
      Amount: t.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary");
    XLSX.writeFile(wb, `Summary_Export_${fromDate || 'All'}_to_${toDate || 'All'}.xlsx`);
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Financial Summary Report", 14, 15);
    doc.setFontSize(10);
    const period = fromDate && toDate ? `Period: ${fromDate} to ${toDate}` : "Period: All Time";
    doc.text(period, 14, 22);

    // Prepare data for PDF
    const tableColumn = ["Date", "Project", "Category", "Description", "Amount"];
    const tableRows = filteredTransactions.map(t => [
        t.date,
        t.project_id,
        t.category,
        t.description.length > 40 ? t.description.substring(0, 40) + '...' : t.description,
        t.amount.toLocaleString()
    ]);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`Summary_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Calculate Totals for Standard Categories (Filtered)
  const categoryTotals = filteredTransactions
    .filter(t => t.sub_category !== 'SCA')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  // Calculate Totals for Projects (Filtered)
  const projectTotals = filteredTransactions
    .filter(t => t.sub_category !== 'SCA')
    .reduce((acc, curr) => {
      acc[curr.project_id] = (acc[curr.project_id] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  // Filter SCA Transactions (Filtered)
  const scaTransactions = filteredTransactions.filter(t => t.sub_category === 'SCA');

  // Calculate Grand Totals for SCA (Filtered)
  const scaGrandGross = scaTransactions.reduce((sum, t) => sum + t.amount, 0);
  const scaGrandPaid = scaTransactions.reduce((sum, t) => {
      const details = extractSCADetails(t.description);
      return sum + details.invoices.reduce((a, b) => a + b, 0);
  }, 0);
  const scaGrandBalance = scaTransactions.reduce((sum, t) => {
      const details = extractSCADetails(t.description);
      return sum + details.balance;
  }, 0);

  // Add SCA Payments to Category Totals for Display
  const displayCategoryTotals = { ...categoryTotals };
  if (scaGrandPaid > 0) {
      displayCategoryTotals['SCA Payments'] = scaGrandPaid;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Summary Reports</h1>
          <p className="text-sm text-muted-foreground">Overview of expenses and SCA payment status.</p>
        </div>
        
        {/* DATE FILTERS */}
        <div className="flex items-end gap-2 bg-slate-50 p-2 rounded-lg border">
            <div className="grid gap-1">
                <Label htmlFor="from" className="text-xs">From Date</Label>
                <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-8 w-[140px]" />
            </div>
            <div className="grid gap-1">
                <Label htmlFor="to" className="text-xs">To Date</Label>
                <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-8 w-[140px]" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setFromDate(''); setToDate(''); }} className="h-8">
                Reset
            </Button>
        </div>

        <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportToExcel}>
                <Download className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" onClick={handleExportToPDF}>
                <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
        </div>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">Standard Summary</TabsTrigger>
          <TabsTrigger value="sca">SCA Status</TabsTrigger>
        </TabsList>

        {/* TAB 1: STANDARD SUMMARY */}
        <TabsContent value="standard">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader><CardTitle>Category-wise Totals</CardTitle></CardHeader>
                    <CardContent>
                        <div className="max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8">Loading...</TableCell></TableRow>
                                    ) : Object.keys(displayCategoryTotals).length > 0 ? (
                                        Object.entries(displayCategoryTotals)
                                            .sort(([,a], [,b]) => b - a)
                                            .map(([catName, amount]) => (
                                                <TableRow key={catName}>
                                                    <TableCell>{catName}</TableCell>
                                                    <TableCell className="text-right font-mono">{amount.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No data found for selected period.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Project-wise Totals</CardTitle></CardHeader>
                    <CardContent>
                        <div className="max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8">Loading...</TableCell></TableRow>
                                    ) : Object.keys(projectTotals).length > 0 ? (
                                        Object.entries(projectTotals)
                                            .sort(([,a], [,b]) => b - a)
                                            .map(([pName, amount]) => (
                                                <TableRow key={pName}>
                                                    <TableCell><Badge variant="outline">{pName}</Badge></TableCell>
                                                    <TableCell className="text-right font-mono">{amount.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                    ) : (
                                        <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No data found for selected period.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        {/* TAB 2: SCA STATUS */}
        <TabsContent value="sca">
          <Card>
            <CardHeader>
                <CardTitle>SCA Payment Status</CardTitle>
                <p className="text-sm text-muted-foreground">Tracking Gross, Paid, and Remaining Balance for Sub-Consultancies.</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project</TableHead>
                            <TableHead>Company (Category)</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Total Gross</TableHead>
                            <TableHead className="text-right">Inv 1</TableHead>
                            <TableHead className="text-right">Inv 2</TableHead>
                            <TableHead className="text-right">Inv 3</TableHead>
                            <TableHead className="text-right">Inv 4</TableHead>
                            <TableHead className="text-right">Total Paid</TableHead>
                            <TableHead className="text-right">Remaining Balance</TableHead>
                            <TableHead>Comments</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={11} className="text-center py-8">Loading...</TableCell></TableRow>
                        ) : scaTransactions.length > 0 ? (
                            scaTransactions.map((t) => {
                                const { paid, balance, note, invoices } = extractSCADetails(t.description);
                                const totalPaidFromInvs = invoices.reduce((a, b) => a + b, 0);
                                
                                return (
                                    <TableRow key={t.id}>
                                        <TableCell><Badge variant="outline">{t.project_id}</Badge></TableCell>
                                        <TableCell className="font-medium">{t.category}</TableCell>
                                        <TableCell className="max-w-xs truncate">{t.description.split('[')[0]}</TableCell>
                                        <TableCell className="text-right font-mono">{t.amount.toLocaleString()}</TableCell>
                                        
                                        <TableCell className="text-right font-mono text-xs">{invoices[0] ? invoices[0].toLocaleString() : '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{invoices[1] ? invoices[1].toLocaleString() : '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{invoices[2] ? invoices[2].toLocaleString() : '-'}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{invoices[3] ? invoices[3].toLocaleString() : '-'}</TableCell>
                                        
                                        <TableCell className="text-right font-mono text-green-600 font-bold">{totalPaidFromInvs.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-red-600 font-bold">{balance.toLocaleString()}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={note}>{note}</TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No SCA records found for selected period.</TableCell></TableRow>
                        )}
                    </TableBody>
                    {scaTransactions.length > 0 && (
                        <tfoot>
                            <TableRow className="bg-slate-50 font-bold border-t-2">
                                <TableCell colSpan={3}>Grand Total</TableCell>
                                <TableCell className="text-right">{scaGrandGross.toLocaleString()}</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right">-</TableCell>
                                <TableCell className="text-right text-green-700">{scaGrandPaid.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-red-700">{scaGrandBalance.toLocaleString()}</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </tfoot>
                    )}
                </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}