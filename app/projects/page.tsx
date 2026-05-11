'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { LayoutDashboard, FileText, Upload, FolderKanban, Tags, BarChart3, PieChart, LogOut } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code?: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const supabase = createClient();

  const fetchProjects = async () => {
    const { data, error } = await supabase.from('projects').select('*').order('name');
    if (!error && data) setProjects(data);
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleSave = async () => {
    if (!formData.name) return alert("Name is required");
    
    if (editingId) {
      await supabase.from('projects').update(formData).eq('id', editingId);
    } else {
      await supabase.from('projects').insert([formData]);
    }
    
    setIsDialogOpen(false);
    setFormData({ name: '', code: '' });
    setEditingId(null);
    fetchProjects();
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setFormData({ name: project.name, code: project.code || '' });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from('projects').delete().eq('id', id);
    fetchProjects();
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar (Same as Dashboard) */}
      <aside className="w-64 bg-white border-r hidden md:block fixed h-full z-10">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600 flex items-center gap-2">
             MMP Expenses
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
          <Link href="/reports" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"><FileText className="h-4 w-4" /> Expenses</Link>
          <Link href="/upload" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"><Upload className="h-4 w-4" /> Upload Excel</Link>
          <Link href="/projects" className="flex items-center gap-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium"><FolderKanban className="h-4 w-4" /> Projects</Link>
          <Link href="/categories" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"><Tags className="h-4 w-4" /> Categories</Link>
          <Link href="/summary" className="flex items-center gap-3 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"><PieChart className="h-4 w-4" /> Summary Report</Link>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
           <Button variant="outline" className="w-full justify-start gap-2" onClick={() => supabase.auth.signOut()}><LogOut className="h-4 w-4" /> Logout</Button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Manage Projects</h1>
          <Button onClick={() => { setEditingId(null); setFormData({name:'', code:''}); setIsDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add Project
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.code || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog for Add/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? 'Edit Project' : 'Add New Project'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="code" className="text-right">Code</Label>
                <Input id="code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="col-span-3" placeholder="Optional" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Project</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}