export const UI_ARCHETYPES: Record<string, string> = {
  Table: `import React from 'react';
import { Activity } from 'lucide-react';

export default function GenericTableWidget() {
  const data = [
    { id: 1, name: 'Item 1', status: 'Active' },
    { id: 2, name: 'Item 2', status: 'Pending' }
  ];

  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">Table Widget</h3>
          <p className="mt-0.5 text-sm text-slate-400">Subtitle</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="flex-1 flex flex-col gap-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-white/5 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 rounded-tl-lg">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">{row.id}</td>
                <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,

  KPIGrid: `import React from 'react';
import { Activity, Thermometer, Map } from 'lucide-react';

export default function GenericKPIGrid() {
  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3">
        <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">KPI Grid</h3>
        <p className="mt-0.5 text-sm text-slate-400">Key Metrics</p>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4">
        <div className="flex flex-col p-4 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Activity className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Metric 1</span>
          </div>
          <span className="text-2xl font-semibold text-white">45.2</span>
        </div>
        <div className="flex flex-col p-4 rounded-xl bg-slate-800/50 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-slate-400">
            <Thermometer className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Metric 2</span>
          </div>
          <span className="text-2xl font-semibold text-white">128</span>
        </div>
      </div>
    </div>
  );
}`,

  RadialChart: `import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Activity } from 'lucide-react';

export default function GenericRadialChart() {
  const data = [{ name: 'Value', value: 75, fill: '#10b981' }];

  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">Radial Gauge</h3>
          <p className="mt-0.5 text-sm text-slate-400">Performance</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* CRITICAL: Hardcoded width and height, NO ResponsiveContainer */}
        <RadialBarChart width={200} height={200} cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={data}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background clockWise dataKey="value" cornerRadius={10} />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-white text-2xl font-bold">
            {data[0].value}%
          </text>
        </RadialBarChart>
      </div>
    </div>
  );
}`,

  LineChart: `import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';

export default function GenericLineChart() {
  const data = [
    { time: '00:00', value: 40 },
    { time: '04:00', value: 60 },
    { time: '08:00', value: 55 },
    { time: '12:00', value: 80 },
  ];

  return (
    <div className="flex min-h-[260px] w-full flex-col rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5 shadow-lg shadow-black/30">
      <div className="mb-4 border-b border-white/5 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-[rgb(var(--accent)/0.95)]">Line Trend</h3>
          <p className="mt-0.5 text-sm text-slate-400">Historical Data</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 overflow-hidden">
        {/* CRITICAL: Hardcoded width and height, NO ResponsiveContainer */}
        <LineChart width={400} height={200} data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <CartesianGrid stroke="#ffffff" strokeOpacity={0.1} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
        </LineChart>
      </div>
    </div>
  );
}`
};
