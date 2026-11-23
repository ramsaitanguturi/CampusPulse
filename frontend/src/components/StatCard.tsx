import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: string;
  onClick?: () => void;
}

export default function StatCard({ title, value, subtitle, badge, onClick }: StatCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`p-4 bg-black border border-neutral-800 font-mono transition-colors ${
        onClick ? 'cursor-pointer hover:border-neutral-600' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-neutral-400 uppercase tracking-wider">
          {title}
        </span>
        {badge && (
          <span className="text-[10px] border border-neutral-700 px-1.5 py-0.2 text-neutral-300">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold text-white tracking-tight tabular-nums">
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-[11px] text-neutral-500 truncate">{subtitle}</p>
      )}
    </div>
  );
}
