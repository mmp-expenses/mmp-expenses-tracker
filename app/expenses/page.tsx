'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Trash2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface Expense {
  id: string;
  date: string;
  project_id: string; // Now just string, no join
  category: string;
  sub_category?: string;
  description: string;
  amount: number;
  status: string;
  reference_no?: string;
  payment_mode?: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  
  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    date: '',
    description: '',
    amount: '',
    category: '',
    reference_no: ''
  });

  const supabase = createClient();

  // Fetch Expenses WITHOUT JOIN (Safe Mode)
  const fetchExpenses = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
        .from('expenses')
        .select('*') // No join here
        .order('date', { ascending: false })
        .limit(200);

        if (error) throw error;
        setExpenses(data || []);
    } catch (err) {
        console.error("Error fetching expenses:", err);
        alert("Could not load expenses. Please check database connection.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  // Open Edit Modal
  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setEditForm({
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      reference_no: expense.reference_no || ''
    });
    setIsEditOpen(true);
  };

  // Save Edited Data
  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    const { error } = await supabase
      .from('expenses')
      .update({
        date: editForm.date,
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        reference_no: editForm.reference_no,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingExpense.id);

    if (error) {
      alert('Error updating expense: ' + error.message);
    } else {
      setIsEditOpen(false);
      fetchExpenses();
    }
  };

  // Delete Expense Function
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this entry?')) {
      return;
    }

    setDeleteLoading(id);

    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) {
      alert('Error deleting expense: ' + error.message);
      setDeleteLoading(null);
    } else {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
      router.refresh(); 
      setDeleteLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">All Expenses</h1>
          <p className="text-sm text-muted-foreground">Manage and verify uploaded transactions.</p>
        </div>
        <Button onClick={fetchExpenses} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh List
        </Button>
      </div>

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Use the <strong>Edit</strong> button to correct details or <strong>Delete</strong> to remove incorrect entries. 
          Currency is displayed in <strong>PKR</strong>. Project IDs are shown as stored in DB.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Project ID</TableHead> {/* Changed from Project Name */}
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount (PKR)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp) => (
                  <TableRow key={exp.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">{exp.date}</TableCell>
                    <TableCell>
                      {/* Show raw project_id (UUID or Code) */}
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                        {exp.project_id}
                      </Badge>
                    </TableCell>
                    <TableCell>{exp.category}</TableCell>
                    <TableCell className="max-w-xs truncate text-slate-600">{exp.description}</TableCell>
                    
                    <TableCell className="text-right font-semibold text-green-700">
                      PKR {Number(exp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={exp.status === 'posted' ? 'default' : 'secondary'}>{exp.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEditClick(exp)}
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600 hover:text-blue-800" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(exp.id)}
                        disabled={deleteLoading === exp.id}
                        title="Delete"
                      >
                        {deleteLoading === exp.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              
              {!loading && expenses.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No expenses found. Upload an Excel file to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog (Same as before) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense Entry</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Input 
                id="date" 
                type="date" 
                value={editForm.date} 
                onChange={e => setEditForm({...editForm, date: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Input 
                id="category" 
                value={editForm.category} 
                onChange={e => setEditForm({...editForm, category: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input 
                id="description" 
                value={editForm.description} 
                onChange={e => setEditForm({...editForm, description: e.target.value})}
                className="col-span-3" 
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount (PKR)</Label>
              <Input 
                id="amount" 
                type="number" 
                step="0.01"
                value={editForm.amount} 
                onChange={e => setEditForm({...editForm, amount: e.target.value})}
                className="col-span-3" 
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ref" className="text-right">Ref No.</Label>
              <Input 
                id="ref" 
                value={editForm.reference_no} 
                onChange={e => setEditForm({...editForm, reference_no: e.target.value})}
                className="col-span-3" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}