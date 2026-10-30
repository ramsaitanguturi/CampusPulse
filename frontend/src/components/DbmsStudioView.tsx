import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Play, 
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl glass-panel-glow border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>DBMS Viva Examination & SQL Query Studio</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide mt-1">
            Relational DBMS Query Workbench
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactive console demonstrating Multi-Table Joins, Group By Aggregations, NOT EXISTS, and Schema Views in real-time.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-500/40 text-cyan-300">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>DIALECT: ORACLE SQL 21c / ORACLEDB</span>
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
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-cyan-500/15 border-cyan-400/80 shadow-lg shadow-cyan-950 glow-cyan text-white'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-bold ${
                  isSelected ? 'bg-cyan-400 text-slate-950 border-cyan-300' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {q.category}
                </span>
                {isSelected && <Play className={`w-3 h-3 text-cyan-400 fill-cyan-400 ${executing ? 'animate-spin' : ''}`} />}
              </div>

              <div className="text-xs font-bold mt-2 truncate">
                {q.title}
              </div>

              <div className="text-[10px] text-slate-400 mt-1 line-clamp-2 font-mono">
                {q.concept}
              </div>
            </button>
          );
        })}
      </div>

      {/* SQL Statement Display & Console */}
      {executionResult && (
        <div className="space-y-4">
          <div className="rounded-2xl glass-panel overflow-hidden border border-slate-800">
            {/* Console Toolbar */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center space-x-3">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">{executionResult.title}</span>
                <span className="text-slate-400 text-[11px] hidden sm:inline">&bull; {executionResult.description}</span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  <Clock className="w-3.5 h-3.5" />
                  <span>LATENCY: {executionResult.execution_time_ms} ms</span>
                </div>

                <div className="text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                  <span>{executionResult.row_count} ROWS</span>
                </div>

                <button
                  onClick={handleCopySql}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Copy SQL Query"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

            {/* SQL Code Block */}
            <div className="p-5 bg-[#050811] overflow-x-auto text-xs font-mono text-cyan-300 border-b border-slate-800 selection:bg-cyan-500/30">
              <pre className="leading-relaxed">
                {executionResult.sql}
              </pre>
            </div>

            {/* Live Data Results Table */}
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 bg-[#0B1220]">
                    {executionResult.columns.map((col) => (
                      <th key={col} className="py-2.5 px-4">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {executionResult.data.length === 0 ? (
                    <tr>
                      <td colSpan={executionResult.columns.length} className="text-center py-8 text-slate-400">
                        Query executed successfully (0 rows returned).
                      </td>
                    </tr>
                  ) : (
                    executionResult.data.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-cyan-500/5 transition-colors"
                      >
                        {executionResult.columns.map((col) => {
                          const val = row[col];
                          const isOccupied = val === 'OCCUPIED' || val === 'CRITICAL';
                          const isAvail = val === 'AVAILABLE' || val === 'OPERATIONAL' || val === 'RESOLVED';
                          const isMaint = val === 'MAINTENANCE' || val === 'IN_PROGRESS';

                          return (
                            <td key={col} className="py-2 px-4 whitespace-nowrap">
                              {isOccupied ? (
                                <span className="text-rose-400 font-semibold">{String(val)}</span>
                              ) : isAvail ? (
                                <span className="text-emerald-400 font-semibold">{String(val)}</span>
                              ) : isMaint ? (
                                <span className="text-amber-400 font-semibold">{String(val)}</span>
                              ) : typeof val === 'number' && col.includes('rate') ? (
                                <span className="text-cyan-300 font-bold">{val}%</span>
                              ) : (
                                String(val ?? 'NULL')
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
