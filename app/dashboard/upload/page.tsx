'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parseExcelFile } from '@/lib/excel-parser';
import { createClient } from '@/lib/supabase/client';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      const arrayBuffer = await selectedFile.arrayBuffer();
      const result = await parseExcelFile(arrayBuffer);
      setPreview(result.expenses);
      setErrors(result.errors);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        alert("Please log in");
        setLoading(false);
        return;
    }

    const { error } = await supabase.from('expenses').insert(
      preview.map(p => ({
        ...p,
        created_by: user.id,
        status: 'draft'
      }))
    );

    if (error) {
      alert('Error saving: ' + error.message);
    } else {
      alert('Import Successful!');
      setPreview([]);
      setFile(null);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Expenses from Excel</h1>
      
      <Card>
        <CardHeader><CardTitle>Upload File (.xlsx)</CardTitle></CardHeader>
        <CardContent>
          <Input type="file" accept=".xlsx" onChange={handleFileChange} />
          {errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
              <h3 className="font-bold">Parsing Errors:</h3>
              <ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </CardContent>
      </Card>

      {preview.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Preview ({preview.length} records)</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-auto border rounded-md">
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
                  {preview.slice(0, 100).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.project_id}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.description}</TableCell>
                      <TableCell className="text-right">{row.amount?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Confirm & Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}