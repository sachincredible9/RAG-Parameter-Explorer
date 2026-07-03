import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Files, Database, Sliders, History, Calendar, ArrowRight, User } from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  const [stats, setStats] = useState({
    documents: 0,
    savedRuns: 0,
    personas: 0,
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [docsRes, logsRes, personasRes] = await Promise.all([
          api.listDocuments(),
          api.getSimulationLogs(),
          api.listPersonas(),
        ]);
        
        setStats({
          documents: docsRes.data.length,
          savedRuns: logsRes.data.length,
          personas: personasRes.data.length,
        });
        setLogs(logsRes.data.slice(0, 5)); // show latest 5
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const cardData = [
    {
      title: 'Uploaded Documents',
      value: stats.documents,
      icon: Files,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
      tab: 'documents',
    },
    {
      title: 'Active Personas',
      value: stats.personas,
      icon: User,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
      tab: 'personas',
    },
    {
      title: 'Simulation Runs',
      value: stats.savedRuns,
      icon: Sliders,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
      tab: 'playground',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-panel p-8">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-app via-indigo-500 to-indigo-650 dark:from-slate-100 dark:via-indigo-200 dark:to-indigo-400">
          DocMind Studio Playground
        </h1>
        <p className="mt-2 text-text-muted max-w-xl">
          Simulate, tweak, and evaluate custom chunking strategy and dynamic personas side-by-side to construct high-performing RAG systems.
        </p>
      </div>

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cardData.map((card, i) => (
          <div
            key={i}
            onClick={() => setActiveTab(card.tab)}
            className={`cursor-pointer rounded-xl bg-gradient-to-br ${card.color} border p-6 glass-card-hover`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-text-muted">{card.title}</p>
                <p className="text-3xl font-bold mt-2 text-text-app">{card.value}</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-input)]/45 border border-border-panel">
                <card.icon className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-text-muted hover:text-text-app">
              Go to View <ArrowRight className="ml-1 h-3. w-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Generation Logs History Table */}
      <div className="rounded-xl glass-panel overflow-hidden">
        <div className="border-b border-border-panel p-5 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-text-app flex items-center">
            <History className="h-5 w-5 mr-2 text-indigo-400" /> Recent Simulation Executions
          </h2>
          <button
            onClick={() => setActiveTab('playground')}
            className="text-xs text-indigo-500 hover:text-indigo-400 font-semibold"
          >
            Run New Simulation
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-text-muted animate-pulse">Loading historical runs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-text-muted/70">No simulation runs executed yet. Go to the Simulator Playground to get started!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-panel bg-slate-500/5 text-text-muted text-xs font-semibold uppercase tracking-wider">
                  <th className="p-4">Persona / System</th>
                  <th className="p-4">Model</th>
                  <th className="p-4">Parameters</th>
                  <th className="p-4">Query</th>
                  <th className="p-4">Latency / Tokens</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-panel text-sm">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-500/5 transition-colors duration-150">
                    <td className="p-4 font-semibold text-text-app">{log.persona_name}</td>
                    <td className="p-4 text-text-muted">
                      <span className="px-2 py-1 rounded bg-[var(--bg-input)] text-xs text-text-app border border-border-panel">
                        {log.model}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-text-muted">
                      C_Size: {log.parameters?.chunk_size || 1000} | Temp: {log.parameters?.temperature || 0.7}
                    </td>
                    <td className="p-4 text-text-app truncate max-w-[200px]" title={log.query}>
                      {log.query}
                    </td>
                    <td className="p-4 text-text-muted text-xs">
                      <span className="text-emerald-500 font-medium">
                        {log.metrics?.generation_time_ms} ms
                      </span>{' '}
                      / {log.metrics?.token_count} tkn
                    </td>
                    <td className="p-4 text-text-muted/65 text-xs flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1 text-indigo-400" />
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
