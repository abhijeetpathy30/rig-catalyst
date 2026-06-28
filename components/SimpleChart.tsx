import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ImpactMetric } from '../types';

interface SimpleChartProps {
  data: ImpactMetric[];
}

export const SimpleChart: React.FC<SimpleChartProps> = ({ data }) => {
  return (
    <div className="h-full w-full bg-white dark:bg-slate-800 rounded-xl p-2 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide text-center">Impact Radar</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
            <PolarGrid stroke="#94a3b8" strokeOpacity={0.3} />
            <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.5}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }} 
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
