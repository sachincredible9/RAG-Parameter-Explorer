import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { User, Plus, Trash2, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react';

export default function PersonaBuilder() {
  const [personas, setPersonas] = useState([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function loadPersonas() {
    setLoading(true);
    try {
      const res = await api.listPersonas();
      setPersonas(res.data);
    } catch (err) {
      console.error('Error fetching personas', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPersonas();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !role || !systemInstruction) {
      setError('Please fill in all fields.');
      return;
    }
    
    setError('');
    setSuccess('');
    try {
      await api.createPersona({
        name,
        role,
        system_instruction: systemInstruction
      });
      setSuccess(`Persona "${name}" created successfully!`);
      setName('');
      setRole('');
      setSystemInstruction('');
      loadPersonas();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create persona.');
    }
  }

  async function handleDelete(personaId) {
    if (!window.confirm('Delete this persona definition?')) return;
    try {
      await api.deletePersona(personaId);
      setSuccess('Persona removed.');
      loadPersonas();
    } catch (err) {
      console.error('Error deleting persona', err);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Create Persona Form */}
      <div className="lg:col-span-5 space-y-6">
        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-text-app flex items-center">
            <Plus className="h-5 w-5 mr-2 text-indigo-400" /> New System Persona
          </h2>
          <p className="text-xs text-text-muted">
            Define role behaviors that are dynamically injected as system prompt configurations.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Persona Label</label>
            <input
              type="text"
              placeholder="e.g. Senior Medical Auditor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-sm text-text-app focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Target Domain / Sub-role</label>
            <input
              type="text"
              placeholder="e.g. Compliance Evaluator"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-sm text-text-app focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">System Instructions</label>
            <textarea
              rows="5"
              placeholder="Inject behavioral instructions here. Explain how the agent should read documents, summarize facts, audit contracts, and behave."
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-sm text-text-app focus:border-indigo-500 focus:outline-none resize-none font-mono"
            />
          </div>

          {success && <p className="text-xs text-emerald-400 flex items-center"><CheckCircle className="h-3.5 w-3.5 mr-1" /> {success}</p>}
          {error && <p className="text-xs text-red-400 flex items-center"><ShieldAlert className="h-3.5 w-3.5 mr-1" /> {error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded p-2.5 text-sm font-semibold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
          >
            Save Persona Definition
          </button>
        </form>
      </div>

      {/* Personas List */}
      <div className="lg:col-span-7 space-y-6">
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-text-app flex items-center">
            <User className="h-5 w-5 mr-2 text-indigo-400" /> System Personas Library
          </h2>

          {loading ? (
            <div className="p-12 text-center text-text-muted/60 animate-pulse">Loading persona templates...</div>
          ) : personas.length === 0 ? (
            <div className="p-12 text-center text-text-muted/65">No personas defined. Use the form to create one.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {personas.map((p) => (
                <div
                  key={p.id}
                  className="bg-[var(--bg-panel)] border border-border-panel hover:border-indigo-500/25 rounded-lg p-5 space-y-3 relative group transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-base font-bold text-text-app">{p.name}</h3>
                      </div>
                      <span className="inline-block text-xs bg-slate-500/10 text-text-muted border border-border-panel px-2 py-0.5 rounded font-mono">
                        {p.role}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-text-muted hover:text-red-500 hover:bg-slate-500/10 rounded transition-all md:opacity-0 group-hover:opacity-100"
                      title="Delete Persona"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="bg-[var(--bg-input)]/75 rounded p-3 border border-border-panel">
                    <div className="flex items-center text-xs font-semibold text-text-muted/60 mb-1">
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      System Instruction:
                    </div>
                    <p className="text-xs text-text-muted font-mono leading-relaxed whitespace-pre-wrap">
                      {p.system_instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
