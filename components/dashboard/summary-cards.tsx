import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardsProps {
  total: number;
  jiap: number;
  atc: number;
}

export function SummaryCards({ total, jiap, atc }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${total.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">JIAP Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${jiap.toLocaleString()}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ATC Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${atc.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}