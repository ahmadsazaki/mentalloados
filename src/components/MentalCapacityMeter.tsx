import React from 'react';
import { motion } from 'motion/react';
import { getRiskLevel } from '../utils';

interface Props {
  totalCLS: number;
  capacity: number;
}

export const MentalCapacityMeter: React.FC<Props> = ({ totalCLS, capacity }) => {
  const mentalRam = Math.min(Math.round((totalCLS / capacity) * 100), 150);
  const risk = getRiskLevel(mentalRam);

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-black/5 dark:border-white/10">
      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Mental RAM</p>
          <h2 className="text-4xl font-medium tracking-tight" style={{ color: risk.color }}>
            {mentalRam}%
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Status</p>
          <p className="font-medium" style={{ color: risk.color }}>{risk.label}</p>
        </div>
      </div>
      
      <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div 
          className="h-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(mentalRam, 100)}%` }}
          style={{ backgroundColor: risk.color }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      
      <div className="mt-4 flex justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
};
