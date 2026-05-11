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
import { Download, Plus, Pencil, Trash2, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface Transaction {
  id: string;
  date: string;
  project_id: string;
  category: string;
  sub_category?: string;
  description: string;
  amount: number;
  status: string;
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Edit/Add State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    project_id: '',
    category: '',
    description: '',
    amount: ''
  });

  const supabase = createClient();

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });

    if (fromDate && toDate) {
      query = query.gte('date', fromDate).lte('date', toDate);
    }

    const { data, error } = await query;
    if (!error && data) setTransactions(data as Transaction[]);
    setLoading(false);
  };

  useEffect(() => { 
      fetchTransactions(); 
  }, []); 

  // --- EXPORT FUNCTIONS ---

  const handleExportToExcel = () => {
    const exportData = transactions.map(t => ({
      Date: t.date,
      Project: t.project_id,
      Category: t.category,
      Description: t.description,
      Amount: t.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Transactions_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Financial Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableColumn = ["Date", "Project", "Category", "Description", "Amount"];
    const tableRows = transactions.map(t => [
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

    doc.save(`Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // --- CRUD OPERATIONS ---

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
        setTransactions(transactions.filter(t => t.id !== id));
    } else {
        alert("Error deleting record");
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormData({
        date: transaction.date,
        project_id: transaction.project_id,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount.toString()
    });
    setIsDialogOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingId(null);
    setFormData({
        date: new Date().toISOString().split('T')[0],
        project_id: '',
        category: '',
        description: '',
        amount: ''
    });
    setIsDialogOpen(true);
  };

  const handleSaveForm = async () => {
    if (!formData.date || !formData.project_id || !formData.category || !formData.amount) {
        alert("Please fill all required fields");
        return;
    }

    const payload = {
        date: formData.date,
        project_id: formData.project_id,
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        status: 'posted'
    };

    let error;
    if (editingId) {
        const res = await supabase.from('expenses').update(payload).eq('id', editingId);
        error = res.error;
    } else {
        const res = await supabase.from('expenses').insert([payload]);
        error = res.error;
    }

    if (!error) {
        setIsDialogOpen(false);
        fetchTransactions();
    } else {
        alert("Error saving record: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Financial Reports</h1>
          <p className="text-sm text-muted-foreground">Detailed transactions and summaries.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportToExcel}><Download className="mr-2 h-4 w-4" /> Excel</Button>
            <Button variant="outline" onClick={handleExportToPDF}><FileText className="mr-2 h-4 w-4" /> PDF</Button>
            <Button onClick={handleAddNewClick}><Plus className="mr-2 h-4 w-4" /> Add New</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={(e) => { e.preventDefault(); fetchTransactions(); }} className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-2"><Label>From Date</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>To Date</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            <Button type="submit">Apply Filters</Button>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">All Transactions</TabsTrigger>
          <TabsTrigger value="summary">Category Summary</TabsTrigger>
          <TabsTrigger value="matrix">Consolidated Matrix</TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL TRANSACTIONS WITH ACTIONS */}
        <TabsContent value="list">
          <Card>
            <CardHeader><CardTitle>All Transactions ({transactions.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{tx.date}</TableCell>
                        <TableCell><Badge variant="outline">{tx.project_id}</Badge></TableCell>
                        <TableCell>{tx.category}</TableCell>
                        <TableCell className="max-w-xs truncate">{tx.description.split('[')[0]}</TableCell>
                        <TableCell className="text-right">{tx.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(tx)}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CATEGORY SUMMARY */}
        <TabsContent value="summary">
           <Card>
             <CardHeader><CardTitle>Category-wise Totals</CardTitle></CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {Object.entries(
                   transactions.reduce((acc, curr) => {
                     acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
                     return acc;
                   }, {} as Record<string, number>)
                 ).sort(([,a], [,b]) => b - a).map(([cat, total]) => (
                   <div key={cat} className="p-4 border rounded-lg shadow-sm">
                     <h3 className="font-semibold text-sm text-muted-foreground">{cat}</h3>
                     <p className="text-2xl font-bold mt-1">PKR {total.toLocaleString()}</p>
                   </div>
                 ))}
               </div>
             </CardContent>
           </Card>
        </TabsContent>

        {/* TAB 3: CONSOLIDATED MATRIX */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader><CardTitle>Consolidated Matrix (Project vs Category)</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              {(() => {
                const uniqueProjects = Array.from(new Set(transactions.map(t => t.project_id))).sort();
                
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white z-10 min-w-[150px]">Category \ Project</TableHead>
                        {uniqueProjects.map(p => (
                          <TableHead key={p} className="min-w-[120px]">{p}</TableHead>
                        ))}
                        <TableHead className="font-bold bg-slate-50 sticky right-0 z-10">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(new Set(transactions.map(t => t.category))).sort().map(cat => {
                        const catTotal = transactions.filter(t => t.category === cat).reduce((sum, t) => sum + t.amount, 0);
                        return (
                          <TableRow key={cat}>
                            <TableCell className="font-medium sticky left-0 bg-white z-10 min-w-[150px]">{cat}</TableCell>
                            {uniqueProjects.map(p => {
                              const val = transactions
                                .filter(t => t.category === cat && t.project_id === p)
                                .reduce((sum, t) => sum + t.amount, 0);
                              return (
                                <TableCell key={p} className="text-right">
                                  {val > 0 ? val.toLocaleString() : '-'}
                                </TableCell>
                              );
                            })}
                            <TableCell className="font-bold bg-slate-50 text-right sticky right-0 z-10">{catTotal.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                <DialogDescription>
                    Make changes to your expense here. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="date" className="text-right">Date</Label>
                    <Input id="date" type="date" className="col-span-3" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="project" className="text-right">Project</Label>
                    <Input id="project" className="col-span-3" placeholder="JIAP or ATC" value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Category</Label>
                    <Input id="category" className="col-span-3" placeholder="e.g. Rent, Salaries" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">Amount</Label>
                    <Input id="amount" type="number" className="col-span-3" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="desc" className="text-right">Description</Label>
                    <Input id="desc" className="col-span-3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveForm}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}