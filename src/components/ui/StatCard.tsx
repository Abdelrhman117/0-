import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  trend?: number;
  color?: 'gold' | 'green' | 'blue' | 'red' | 'amber';
  sublabel?: string;
}

const colorMap = {
  gold:  { icon: 'text-coffee-300',  bg: 'bg-coffee-300/10',  border: 'border-coffee-300/20'  },
  green: { icon: 'text-green-400',   bg: 'bg-green-400/10',   border: 'border-green-400/20'   },
  blue:  { icon: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20'    },
  red:   { icon: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20'     },
  amber: { icon: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20'   },
};

export default function StatCard({ label, value, unit, icon: Icon, trend, color = 'gold', sublabel }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex items-start gap-4 hover:border-coffee-700/50 transition-colors">
      <div className={`p-3 rounded-xl ${c.bg} border ${c.border}`}>
        <Icon size={22} className={c.icon} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-coffee-500 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-coffee-100 text-2xl font-bold leading-none">{value}</span>
          {unit && <span className="text-coffee-500 text-sm">{unit}</span>}
        </div>
        {sublabel && <p className="text-coffee-600 text-xs mt-1">{sublabel}</p>}

        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </div>
  );
}
