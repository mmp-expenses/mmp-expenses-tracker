"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Custom Tooltip for better look
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border shadow-lg rounded-md text-sm">
        <p className="font-bold text-slate-700">{label}</p>
        <p className="text-blue-600">
          Amount: ${payload[0].value.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export function ExpenseChart({ data }: { data: any[] }) {
  // Aggregate data by Category for the chart
  const categoryData = data.reduce((acc: any, curr: any) => {
    const cat = curr.category || 'Other';
    acc[cat] = (acc[cat] || 0) + Number(curr.amount);
    return acc;
  }, {});

  const chartData = Object.keys(categoryData).map(key => ({
    name: key,
    amount: categoryData[key]
  })).sort((a, b) => b.amount - a.amount).slice(0, 6); // Top 6 categories

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="name" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#64748b', fontSize: 12 }} 
          dy={10}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#64748b', fontSize: 12 }} 
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#6366f1'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}