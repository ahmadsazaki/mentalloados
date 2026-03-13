import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Task, Category } from '../types';
import { AlertTriangle } from 'lucide-react';

interface Props {
  tasks: Task[];
  categories: Category[];
}

export const LoadHeatmap: React.FC<Props> = ({ tasks, categories }) => {
  const activeTasks = tasks.filter(t => !t.completed);
  const totalLoad = activeTasks.reduce((acc, t) => acc + t.cognitive_load_score, 0);
  
  const data = categories.map(cat => {
    const catTasks = activeTasks.filter(t => t.category_id === cat.id);
    const load = catTasks.reduce((acc, t) => acc + t.cognitive_load_score, 0);
    const percentage = totalLoad > 0 ? Math.round((load / totalLoad) * 100) : 0;
    return {
      name: cat.name,
      value: load,
      percentage,
      color: cat.color,
      maxCapacity: cat.max_capacity || 50
    };
  }).filter(d => d.value > 0);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central" 
        className="text-[10px] font-bold pointer-events-none"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/10">
      <h3 className="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Load Distribution</h3>
      
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="w-full md:w-1/2 h-[200px] relative">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                    backgroundColor: 'var(--tw-colors-slate-800)',
                    color: 'white'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} CLS`, 'Cognitive Load']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-100 dark:border-white/10 rounded-full aspect-square mx-auto">
              <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">No Data</p>
            </div>
          )}
        </div>
        
        <div className="w-full md:w-1/2 space-y-3">
          {data.map((item, i) => {
            const isOverloaded = item.value > item.maxCapacity;
            return (
              <div key={i} className="flex flex-col group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-gray-900 dark:text-gray-100">{item.percentage}%</span>
                    <div className="w-12 h-1 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full transition-[width] duration-1000 ${isOverloaded ? 'opacity-50' : ''}`}
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }} 
                      />
                    </div>
                  </div>
                </div>
                {isOverloaded && (
                  <div className="pl-6 mt-1 flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-[11px] font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Over capacity ({item.value.toFixed(1)} / {item.maxCapacity})
                  </div>
                )}
              </div>
            );
          })}
          {data.length === 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400 italic">Add some tasks to see your load distribution.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
