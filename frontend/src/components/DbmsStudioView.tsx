import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Terminal, 
  Clock, 
  Copy,
  Check
} from 'lucide-react';
import { QueryCatalogueItem, QueryExecutionResult } from '../types';
import { api } from '../services/api';

export const DbmsStudioView: React.FC = () => {
  const [queries, setQueries] = useState<QueryCatalogueItem[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string>('multi_table_join');
  const [executionResult, setExecutionResult] = useState<QueryExecutionResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExecute = async (queryId: string) => {
    setSelectedQueryId(queryId);
    setExecuting(true);
    try {
      const res = await api.executeAnalyticsQuery(queryId);
      setExecutionResult(res);
    } catch (err) {
      console.error('Failed to execute query:', err);
    } finally {
      setExecuting(false);
    }
  };

  const handleCopySql = () => {
    if (executionResult?.sql) {
      navigator.clipboard.writeText(executionResult.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadCatalogue = async () => {
    try {
      const data = await api.getAnalyticsQueries();
      setQueries(data);
      if (data.length > 0) {
        handleExecute(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load query catalogue:', err);
    }
  };

  useEffect(() => {
    loadCatalogue();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            DBMS Query Studio & SQL Console
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Pre-compiled relational queries demonstrating joins, aggregations, NOT EXISTS, and views with live execution telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-[#0C0C12] px-3 py-2 rounded-lg border border-[#1E1D2A] text-zinc-300">
          <Database className="w-4 h-4 text-violet-400" />
          <span>Oracle SQL 21c / SQLAlchemy</span>
        </div>
      </div>

      {/* Query Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {queries.map((q) => {
          const isSelected = selectedQueryId === q.id;
          return (
            <button
              key={q.id}
              id={`query-tab-${q.id}`}
              onClick={() => handleExecute(q.id)}
              disabled={executing}
              className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-violet-950/40 text-white border-violet-800/60 shadow-sm'
                  : 'bg-[#0C0C10] border-[#1C1B24] text-zinc-400 hover:text-white hover:border-[#2D2A3A]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded border uppercase font-medium ${
                  isSelected ? 'bg-violet-600 text-white border-violet-500' : 'bg-[#14141C] text-zinc-400 border-[#252433]'
                }`}>
                  {q.category}
                </span>
              </div>

              <div className="text-xs font-semibold mt-2.5 text-white truncate">
                {q.title}
              </div>

              <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                {q.concept}
              </div>
            </button>
          );
        })}
      </div>

      {/* SQL Statement Display & Console */}
      {executionResult && (
        <div className="space-y-4">
          <div className="surface-card rounded-xl overflow-hidden">
            {/* Console Toolbar */}
            <div className="px-5 py-3 border-b border-[#1C1B24] bg-[#0A0A0E] flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <Terminal className="w-4 h-4 text-violet-400" />
                <span className="font-semibold text-white">{executionResult.title}</span>
                <span className="text-zinc-400 hidden sm:inline">&bull; {executionResult.description}</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-800/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-medium">{executionResult.execution_time_ms} ms</span>
                </div>

                <div className="text-zinc-300 bg-[#14141C] px-2.5 py-1 rounded-md border border-[#252433]">
                  <span className="tabular-nums">{executionResult.row_count} rows</span>
                </div>

                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#14141C] hover:bg-[#1E1E2A] text-zinc-300 border border-[#252433] transition-colors cursor-pointer"
                  title="Copy SQL Query"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>

            {/* SQL Code Block */}
            <div className="p-4 bg-[#050508] overflow-x-auto text-xs font-mono text-[#DDD6FE] border-b border-[#1C1B24]">
              <pre className="leading-relaxed">
                {executionResult.sql}
              </pre>
            </div>

            {/* Live Data Results Table */}
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1C1B24] bg-[#0A0A0E] text-zinc-300 uppercase tracking-wider sticky top-0 font-semibold">
                    {executionResult.columns.map((col) => (
                      <th key={col} className="py-2.5 px-4">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1B24] text-zinc-300">
                  {executionResult.data.length === 0 ? (
                    <tr>
                      <td colSpan={executionResult.columns.length} className="text-center py-8 text-zinc-400">
                        Query executed successfully (0 rows returned).
                      </td>
                    </tr>
                  ) : (
                    executionResult.data.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-[#12111A] transition-colors"
                      >
                        {executionResult.columns.map((col) => {
                          const val = row[col];
                          const isOccupied = val === 'OCCUPIED' || val === 'CRITICAL';
                          const isAvail = val === 'AVAILABLE' || val === 'OPERATIONAL' || val === 'RESOLVED';
                          const isMaint = val === 'MAINTENANCE' || val === 'IN_PROGRESS';

                          return (
                            <td key={col} className="py-2.5 px-4 whitespace-nowrap font-mono">
                              {isOccupied ? (
                                <span className="text-rose-400 font-medium">{String(val)}</span>
                              ) : isAvail ? (
                                <span className="text-emerald-400 font-medium">{String(val)}</span>
                              ) : isMaint ? (
                                <span className="text-amber-400 font-medium">{String(val)}</span>
                              ) : typeof val === 'number' && col.includes('rate') ? (
                                <span className="text-violet-300 font-medium tabular-nums">{val}%</span>
                              ) : (
                                <span className="tabular-nums">{String(val ?? 'NULL')}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
