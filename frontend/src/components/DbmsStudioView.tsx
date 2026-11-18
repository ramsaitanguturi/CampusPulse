import React, { useState, useEffect } from 'react';
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
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-base font-bold text-white uppercase tracking-wider">
            DBMS Query Studio &amp; SQL Console
          </h1>
          <p className="text-xs text-neutral-500">
            Relational queries demonstrating joins, aggregations, NOT EXISTS, and views with live execution telemetry
          </p>
        </div>

        <div className="border border-neutral-700 px-3 py-1 text-xs text-white">
          <span>ENGINE: </span>
          <span className="font-bold">ORACLE 21C / ACID COMPLIANT</span>
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
              className={`p-3 bg-black border text-left transition-colors cursor-pointer font-mono ${
                isSelected
                  ? 'border-white bg-neutral-950 font-bold text-white'
                  : 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${
                  isSelected ? 'border-white bg-white text-black' : 'border-neutral-800 text-neutral-500'
                }`}>
                  [{q.category}]
                </span>
              </div>

              <div className="text-xs font-bold mt-2 text-white truncate uppercase tracking-tight">
                {q.title}
              </div>

              <div className="text-[10px] text-neutral-500 mt-1 line-clamp-2">
                {q.concept}
              </div>
            </button>
          );
        })}
      </div>

      {/* SQL Statement Display & Console */}
      {executionResult && (
        <div className="space-y-4 font-mono">
          <div className="bg-black border border-neutral-800 overflow-hidden">
            {/* Console Toolbar */}
            <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white uppercase">{executionResult.title}</span>
                <span className="text-neutral-500 text-[11px] hidden sm:inline">&bull; {executionResult.description}</span>
              </div>

              <div className="flex items-center space-x-2 text-[11px]">
                <div className="border border-neutral-700 px-2 py-0.5 text-white">
                  <span>EXEC: </span>
                  <span className="font-bold tabular-nums">{executionResult.execution_time_ms} ms</span>
                </div>

                <div className="border border-neutral-800 px-2 py-0.5 text-neutral-400">
                  <span className="tabular-nums">{executionResult.row_count} ROWS</span>
                </div>

                <button
                  onClick={handleCopySql}
                  className="px-2.5 py-0.5 bg-black hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-700 transition cursor-pointer font-bold"
                  title="Copy SQL Query"
                >
                  {copied ? '[COPIED]' : '[COPY SQL]'}
                </button>

                <button
                  onClick={() => handleExecute(selectedQueryId)}
                  disabled={executing}
                  className="px-2.5 py-0.5 bg-white text-black hover:bg-neutral-200 transition cursor-pointer font-bold"
                  title="Re-run query"
                >
                  {executing ? '[RUNNING...]' : '[EXECUTE]'}
                </button>
              </div>
            </div>

            {/* SQL Code Block */}
            <div className="p-4 bg-neutral-950 overflow-x-auto text-xs font-mono text-neutral-200 border-b border-neutral-800">
              <pre className="leading-relaxed">
                {executionResult.sql}
              </pre>
            </div>

            {/* Live Data Results Table */}
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 text-neutral-500 text-[11px] border-b border-neutral-800 uppercase sticky top-0">
                  <tr>
                    {executionResult.columns.map((col) => (
                      <th key={col} className="py-2.5 px-3">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-300">
                  {executionResult.data.length === 0 ? (
                    <tr>
                      <td colSpan={executionResult.columns.length} className="text-center py-8 text-neutral-500">
                        Query executed successfully (0 rows returned).
                      </td>
                    </tr>
                  ) : (
                    executionResult.data.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-neutral-950 transition-colors"
                      >
                        {executionResult.columns.map((col) => {
                          const val = row[col];
                          const isOccupied = val === 'OCCUPIED' || val === 'CRITICAL';
                          const isAvail = val === 'AVAILABLE' || val === 'OPERATIONAL' || val === 'RESOLVED';
                          const isMaint = val === 'MAINTENANCE' || val === 'IN_PROGRESS';

                          return (
                            <td key={col} className="py-2.5 px-3 whitespace-nowrap font-mono">
                              {isOccupied ? (
                                <span className="border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white">
                                  [{String(val)}]
                                </span>
                              ) : isAvail ? (
                                <span className="border border-neutral-500 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-white font-bold">
                                  [{String(val)}]
                                </span>
                              ) : isMaint ? (
                                <span className="border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-400">
                                  [{String(val)}]
                                </span>
                              ) : typeof val === 'number' && col.includes('rate') ? (
                                <span className="text-white font-bold tabular-nums">{val}%</span>
                              ) : (
                                <span className="tabular-nums text-neutral-300">{String(val ?? 'NULL')}</span>
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
