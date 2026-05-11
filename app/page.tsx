import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, BarChart3, DollarSign } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-800">JIAP-ATC Accounting System</h1>
        </div>
        <nav className="flex gap-4">
          <Link href="/dashboard">
            <Button variant="ghost">Dashboard</Button>
          </Link>
          <Link href="/upload">
            <Button variant="ghost">Upload Data</Button>
          </Link>
          <Link href="/reports">
            <Button variant="ghost">Reports</Button>
          </Link>
          <Link href="/summary">
            <Button variant="ghost">Summary</Button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Welcome to Expense Tracking System</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Efficiently manage your project expenses, salaries, and sub-consultancy agreements for JIAP and ATC Tower projects. 
            Upload Excel files, view detailed reports, and track payments in real-time.
          </p>
        </div>

        {/* Quick Stats Cards (Placeholder) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">JIAP & ATC Tower</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-muted-foreground">SCA, Salaries, Rent, etc.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Online</div>
              <p className="text-xs text-muted-foreground">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <h3 className="text-xl font-semibold text-slate-800 mb-6">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          
          {/* Upload Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/upload">
              <CardHeader>
                <div className="bg-blue-100 w-fit p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="mt-4">Upload Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Upload SCA, Salary, or Standard expense files (.xlsx). The system automatically detects the format and parses the data.
                </p>
              </CardContent>
            </Link>
          </Card>

          {/* Reports Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/reports">
              <CardHeader>
                <div className="bg-green-100 w-fit p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="mt-4">Detailed Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  View, edit, and delete individual transactions. Filter by date and export detailed reports to PDF or Excel.
                </p>
              </CardContent>
            </Link>
          </Card>

          {/* Summary Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <Link href="/summary">
              <CardHeader>
                <div className="bg-purple-100 w-fit p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="mt-4">Summary & Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  Get category-wise totals, project summaries, and detailed SCA payment status including invoice breakdowns.
                </p>
              </CardContent>
            </Link>
          </Card>

        </div>
      </main>

      {/* FOOTER SECTION */}
      <footer className="py-6 text-center border-t bg-white mt-auto">
        <p className="text-sm text-slate-500 font-medium">
          This Software is Designed & Developed by <span className="font-bold text-blue-600">SLM</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          © {new Date().getFullYear()} All Rights Reserved.
        </p>
      </footer>

    </div>
  );
}