import { createClient } from '@/lib/supabase/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Recent Expenses</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses?.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell>{exp.date}</TableCell>
                <TableCell>{exp.project_id}</TableCell>
                <TableCell>{exp.category}</TableCell>
                <TableCell className="max-w-xs truncate">{exp.description}</TableCell>
                <TableCell className="text-right">${Number(exp.amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={exp.status === 'completed' ? 'default' : 'secondary'}>
                    {exp.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}