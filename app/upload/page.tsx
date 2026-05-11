'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { parseExcelFile } from '@/lib/excel-parser';
import { createClient } from '@/lib/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [fileType, setFileType] = useState<'sca' | 'salaries' | 'standard' | null>(null);
  
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setErrors([]);
      setSuccessMsg('');
      setPreview([]);
      setFileType(null);
      
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // 1. Detect File Type
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      let detectedType: 'sca' | 'salaries' | 'standard' = 'standard';
      
      if (jsonData.length > 0) {
          // Check for SCA FIRST
          const hasSCAHeaders = JSON.stringify(jsonData).toLowerCase().includes('company name') && 
                                JSON.stringify(jsonData).toLowerCase().includes('total gross amount');
          
          if (hasSCAHeaders) {
              detectedType = 'sca';
              console.log("✅ Detected as SCA file");
          } else {
              // Check for Salaries
              const headerRowStr = JSON.stringify(jsonData[0]).toLowerCase();
              const hasMonthHeaders = jsonData[0].some((cell: any) => {
                  if (typeof cell === 'string') return cell.match(/^[A-Za-z]{3}[-\s]\d{2}$/i);
                  if (typeof cell === 'number' && cell > 45000 && cell < 47000) return true;
                  return false;
              });
              const hasUserName = headerRowStr.includes('user name');
              
              if (hasMonthHeaders || hasUserName) {
                  detectedType = 'salaries';
                  console.log("✅ Detected as Salaries file");
              } else {
                  // 3. Default to Standard (Rent, Utilities, etc.)
                  const firstRowHasDate = headerRowStr.includes('date');
                  const firstRowHasAmount = headerRowStr.includes('amount') || headerRowStr.includes('total');
                  
                  if (firstRowHasDate && firstRowHasAmount) {
                      detectedType = 'standard';
                      console.log("✅ Detected as Standard file");
                  } else {
                      detectedType = 'standard'; // Fallback
                      console.log("⚠️ Fallback to Standard file");
                  }
              }
          }
      }
      
      setFileType(detectedType);
      console.log("🔍 Final Detected Type:", detectedType);

      const result = await parseExcelFile(arrayBuffer);
      console.log("📊 Parsed Expenses Count:", result.expenses.length); // Debug log
      console.log("📝 Errors:", result.errors); // Debug log
      
      if (detectedType === 'sca') {
          setPreview(result.expenses);
      } else if (detectedType === 'salaries') {
           const salaryExpenses = result.expenses.filter(e => e.category === 'Payroll Salaries');
           
           // Enhance preview with employee details if available
           const enhancedPreview = salaryExpenses.map(exp => ({
               ...exp,
               user_name: exp.user_name || 'N/A',
               full_name: exp.full_name || 'N/A',
               position: exp.position || 'N/A'
           }));
           
           setPreview(enhancedPreview);
      } else {
          setPreview(result.expenses);
      }
      
      setErrors(result.errors);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccessMsg('');
    
    const response = await supabase.auth.getUser();
    const user = response.data.user;
    if (!user) { alert("Please log in."); setLoading(false); return; }

    // Clean up data before saving: Ensure only valid DB fields are sent
    const expensesToInsert = preview.map(p => ({
        date: p.date,
        project_id: p.project_id,
        category: p.category,
        sub_category: p.sub_category || '',
        description: p.description,
        amount: p.amount,
        status: 'posted',
        created_by: user.id,
        payment_mode: 'Bank' // FORCE ALL TO BANK TO MATCH DB CONSTRAINT
    }));

    try {
        const { error } = await supabase.from('expenses').insert(expensesToInsert);
        if (error) throw error;

        setSuccessMsg(`✅ Successfully saved ${expensesToInsert.length} records!`);
        setPreview([]);
        setFile(null);
        setFileType(null);
        document.getElementById('file-upload')!.value = '';
    } catch (err: any) {
        alert('Error: ' + err.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Expenses</h1>
        <p className="text-sm text-muted-foreground">Upload Excel file. System auto-detects format.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upload File (.xlsx)</CardTitle></CardHeader>
        <CardContent>
          <Input id="file-upload" type="file" accept=".xlsx" onChange={handleFileChange} />
          
          {errors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errors</AlertTitle>
              <AlertDescription>{errors.join(', ')}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
              <Alert className="bg-green-50 border-green-200 text-green-800 mt-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
          )}

          {preview.length > 0 && (
            <div className="mt-6">
               <h3 className="font-semibold mb-2">
                 Preview ({preview.length} records) 
                 {fileType && <Badge className="ml-2 bg-blue-100 text-blue-800">
                    {fileType === 'sca' ? 'SCA Details' : fileType === 'salaries' ? 'Salaries' : 'Standard'}
                 </Badge>}
               </h3>
               
               <div className="max-h-[400px] overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {fileType === 'sca' ? (
                          <>
                            <TableHead>Category</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Gross Amt</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </>
                        ) : fileType === 'salaries' ? (
                          <>
                            <TableHead>Name</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead>Date</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 20).map((row, idx) => (
                        <TableRow key={idx}>
                          {fileType === 'sca' ? (
                            <>
                              <TableCell className="font-medium">{row.category}</TableCell>
                              <TableCell><Badge variant="outline">{row.project_id}</Badge></TableCell>
                              <TableCell className="max-w-[200px] truncate">{row.description.split('[')[0]}</TableCell>
                              <TableCell className="text-right font-mono">{row.amount?.toLocaleString()}</TableCell>
                              {/* Extract Paid/Bal from Description */}
                              <TableCell className="text-right font-mono text-green-600">
                                  {row.description.match(/PAID:([\d.]+)/)?.[1] || '0'}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-600">
                                  {row.description.match(/BAL:([\d.]+)/)?.[1] || '0'}
                              </TableCell>
                            </>
                          ) : fileType === 'salaries' ? (
                            <>
                              <TableCell>{row.description.replace('Salary for ', '')}</TableCell>
                              <TableCell><Badge variant="outline">{row.project_id}</Badge></TableCell>
                              <TableCell>{row.date}</TableCell>
                              <TableCell className="text-right font-mono">{row.amount?.toLocaleString()}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{row.date}</TableCell>
                              <TableCell>{row.category}</TableCell>
                              <TableCell><Badge variant="secondary">{row.project_id}</Badge></TableCell>
                              <TableCell className="max-w-xs truncate">{row.description}</TableCell>
                              <TableCell className="text-right">{row.amount?.toFixed(2)}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
               </div>
               
               <div className="mt-4 flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => { setPreview([]); setFile(null); setFileType(null); }}>Cancel</Button>
                  <Button onClick={handleSave} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Now
                  </Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}