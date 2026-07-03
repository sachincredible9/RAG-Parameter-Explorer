import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Play, Sliders, ChevronRight, FileText, ArrowRightLeft, Sparkles, BookOpen, Clock, Cpu } from 'lucide-react';

export default function SimulatorPlayground() {
  const [documents, setDocuments] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [selectedPersonaId, setSelectedPersonaId] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Configuration A Params
  const [configA, setConfigA] = useState({
    model: 'mistral-7b-instruct-gguf',
    chunk_size: 1000,
    chunk_overlap: 200,
    temperature: 0.2,
    top_p: 0.95,
    top_k: 40,
  });

  // Configuration B Params
  const [configB, setConfigB] = useState({
    model: 'mistral-7b-instruct-gguf',
    chunk_size: 500,
    chunk_overlap: 100,
    temperature: 0.8,
    top_p: 0.95,
    top_k: 40,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [docsRes, personasRes] = await Promise.all([
          api.listDocuments(),
          api.listPersonas(),
        ]);
        setDocuments(docsRes.data);
        setPersonas(personasRes.data);
        
        if (docsRes.data.length > 0) setSelectedDocId(docsRes.data[0].id);
        if (personasRes.data.length > 0) {
          setSelectedPersonaId(personasRes.data[0].id);
          setSystemInstruction(personasRes.data[0].system_instruction);
        }
      } catch (err) {
        console.error('Error loading playground data', err);
      }
    }
    loadData();
  }, []);

  // Update system prompt textarea when preset persona changes
  const handlePersonaChange = (e) => {
    const id = e.target.value;
    setSelectedPersonaId(id);
    if (id === 'custom') {
      setSystemInstruction('');
    } else {
      const selected = personas.find(p => p.id === id);
      if (selected) {
        setSystemInstruction(selected.system_instruction);
      }
    }
  };

  const handleUseCaseChange = (e) => {
    const val = e.target.value;
    if (val === 'support') {
      const terminix = documents.find(d => d.filename.toLowerCase().includes('terminix') || d.filename.toLowerCase().includes('contract'));
      if (terminix) {
        setSelectedDocId(terminix.id);
      } else if (documents.length > 0) {
        setSelectedDocId(documents[0].id);
      }
      
      const supportPersona = personas.find(p => p.name.toLowerCase().includes('support') || p.name.toLowerCase().includes('customer'));
      if (supportPersona) {
        setSelectedPersonaId(supportPersona.id);
        setSystemInstruction(supportPersona.system_instruction);
      } else {
        setSelectedPersonaId('custom');
        setSystemInstruction('You are a helpful customer support agent. Answer questions concisely based only on the provided context.');
      }
      
      setQuery('What is covered under the Terminix service guarantee? Are structural pest damages excluded?');
      
      setConfigA({
        model: 'mistral-7b-instruct-gguf',
        chunk_size: 400,
        chunk_overlap: 80,
        temperature: 0.2,
        top_p: 0.95,
        top_k: 40
      });
      
      setConfigB({
        model: 'mistral-7b-instruct-gguf',
        chunk_size: 1500,
        chunk_overlap: 0,
        temperature: 0.8,
        top_p: 0.95,
        top_k: 40
      });
    } else if (val === 'legal') {
      const contract = documents.find(d => d.filename.toLowerCase().includes('contract') || d.filename.toLowerCase().includes('legal'));
      if (contract) {
        setSelectedDocId(contract.id);
      } else if (documents.length > 0) {
        setSelectedDocId(documents[0].id);
      }
      
      const legalPersona = personas.find(p => p.name.toLowerCase().includes('legal') || p.name.toLowerCase().includes('research'));
      if (legalPersona) {
        setSelectedPersonaId(legalPersona.id);
        setSystemInstruction(legalPersona.system_instruction);
      } else {
        setSelectedPersonaId('custom');
        setSystemInstruction('You are a senior legal auditor. Analyze clauses carefully, identify liability limits, and cite section numbers.');
      }
      
      setQuery('Identify any limitations of liability, arbitration terms, or exclusions of structural damage.');
      
      setConfigA({
        model: 'mistral-7b-instruct-gguf',
        chunk_size: 1000,
        chunk_overlap: 200,
        temperature: 0.1,
        top_p: 0.9,
        top_k: 30
      });
      
      setConfigB({
        model: 'mistral-7b-instruct-gguf',
        chunk_size: 300,
        chunk_overlap: 20,
        temperature: 0.7,
        top_p: 0.95,
        top_k: 50
      });
    } else if (val === 'medical') {
      const med = documents.find(d => d.filename.toLowerCase().includes('medical') || d.filename.toLowerCase().includes('audit') || d.filename.toLowerCase().includes('terminix'));
      if (med) {
        setSelectedDocId(med.id);
      } else if (documents.length > 0) {
        setSelectedDocId(documents[0].id);
      }
      
      const medPersona = personas.find(p => p.name.toLowerCase().includes('medical') || p.name.toLowerCase().includes('auditor') || p.name.toLowerCase().includes('compliance'));
      if (medPersona) {
        setSelectedPersonaId(medPersona.id);
        setSystemInstruction(medPersona.system_instruction);
      } else {
        setSelectedPersonaId('custom');
        setSystemInstruction('You are a senior medical compliance auditor. Review patient records or guidelines for audit compliance.');
      }
      
      setQuery('Summarize the primary guidelines, billing regulations, and audit requirements.');
      
      setConfigA({
        model: 'mistral-7b-instruct-gguf',
        chunk_size: 800,
        chunk_overlap: 150,
        temperature: 0.15,
        top_p: 0.9,
        top_k: 40
      });
      
      setConfigB({
        model: 'mistral-7b-instruct-gguf',
        chunk_size: 2000,
        chunk_overlap: 500,
        temperature: 0.5,
        top_p: 0.95,
        top_k: 40
      });
    }
  };

  // Run Preset Queries helper
  const handlePresetQuery = (type) => {
    if (type === 'summarize') {
      setQuery('Summarize the principal details, major terms, and key points of this document into an executive summary bullet list.');
    } else if (type === 'entities') {
      setQuery('Extract all key entities from this document, including dates, organizations, contract values, clauses, and names. Format as a markdown table.');
    } else if (type === 'email') {
      setQuery('Draft a formal follow-up email addressed to key stakeholders summarizing the findings, risks, and next steps outlined in this document.');
    }
  };

  const handleSimulate = async () => {
    if (!selectedDocId) {
      alert('Please select a document first.');
      return;
    }
    if (!query) {
      alert('Please enter a query or choose a preset.');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await api.runSimulation({
        document_id: selectedDocId,
        query,
        system_instruction: systemInstruction,
        config_a: configA,
        config_b: configB
      });
      setResult(res.data);
    } catch (err) {
      console.error('Simulation execution failed', err);
      alert(err.response?.data?.detail || 'Simulation failed to run. Check server connection.');
    } finally {
      setLoading(false);
    }
  };

  const modelOptions = [
    { value: 'mistral-7b-instruct-gguf', label: 'Mistral 7B Instruct (Local GGUF)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { value: 'custom-llm', label: 'Custom LLM (Tenant Settings)' }
  ];

  return (
    <div className="space-y-6">
      {/* Start Here: Use Case Presets */}
      <div className="glass-panel rounded-xl p-5 border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-text-app flex items-center">
            <Sparkles className="h-4 w-4 mr-1.5 text-indigo-400 animate-pulse" /> Start Here: Use Case Presets
          </h3>
          <p className="text-xs text-text-muted">
            Select a common workload to automatically pre-configure optimized chunk sizes, overlap ranges, system personas, and comparative settings.
          </p>
        </div>
        <div className="w-full md:w-72 space-y-1.5">
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Use Case</label>
          <select
            onChange={handleUseCaseChange}
            defaultValue=""
            className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-sm text-text-app font-semibold focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="" disabled>-- Select a Use Case --</option>
            <option value="support">Customer Support Chatbot</option>
            <option value="legal">Legal Contract Researcher</option>
            <option value="medical">Medical Auditor</option>
          </select>
        </div>
      </div>

      {/* 1. Global Setup Context */}
      <div className="glass-panel rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Select Source Document</label>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-sm text-text-app focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              {documents.length === 0 ? (
                <option value="">No documents uploaded yet</option>
              ) : (
                documents.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Choose Persona Prompt</label>
            <select
              value={selectedPersonaId}
              onChange={handlePersonaChange}
              className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-sm text-text-app focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              {personas.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
              ))}
              <option value="custom">-- Custom Free-form System Prompt --</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2 flex flex-col space-y-1">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">System Instruction</label>
          <textarea
            rows={4}
            value={systemInstruction}
            onChange={(e) => {
              setSelectedPersonaId('custom');
              setSystemInstruction(e.target.value);
            }}
            placeholder="Edit instructions here..."
            className="flex-1 rounded bg-[var(--bg-input)] border border-border-panel p-3 text-sm text-text-app font-mono leading-relaxed focus:border-indigo-500 focus:outline-none resize-y min-h-[120px]"
          />
        </div>
      </div>

      {/* 2. Parameters Configuration Side-by-Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config A Panel */}
        <div className="glass-panel rounded-xl p-5 bg-gradient-to-b from-indigo-500/5 to-slate-500/5">
          <div className="flex justify-between items-center border-b border-border-panel pb-3 mb-4">
            <h3 className="text-sm font-bold text-indigo-550 dark:text-indigo-400 flex items-center">
              <Sliders className="h-4 w-4 mr-2" /> Simulation Configuration A
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Model Selection</label>
              <select
                value={configA.model}
                onChange={(e) => setConfigA({ ...configA, model: e.target.value })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              >
                {modelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chunk Size</label>
              <input
                type="number"
                value={configA.chunk_size}
                onChange={(e) => setConfigA({ ...configA, chunk_size: parseInt(e.target.value) || 1000 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chunk Overlap</label>
              <input
                type="number"
                value={configA.chunk_overlap}
                onChange={(e) => setConfigA({ ...configA, chunk_overlap: parseInt(e.target.value) || 0 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Temperature</label>
              <input
                type="number"
                step="0.05"
                value={configA.temperature}
                onChange={(e) => setConfigA({ ...configA, temperature: parseFloat(e.target.value) || 0.0 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Top P</label>
              <input
                type="number"
                step="0.05"
                value={configA.top_p}
                onChange={(e) => setConfigA({ ...configA, top_p: parseFloat(e.target.value) || 0.0 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Config B Panel */}
        <div className="glass-panel rounded-xl p-5 bg-gradient-to-b from-emerald-500/5 to-slate-500/5">
          <div className="flex justify-between items-center border-b border-border-panel pb-3 mb-4">
            <h3 className="text-sm font-bold text-emerald-650 dark:text-emerald-400 flex items-center">
              <Sliders className="h-4 w-4 mr-2" /> Simulation Configuration B
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Model Selection</label>
              <select
                value={configB.model}
                onChange={(e) => setConfigB({ ...configB, model: e.target.value })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              >
                {modelOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chunk Size</label>
              <input
                type="number"
                value={configB.chunk_size}
                onChange={(e) => setConfigB({ ...configB, chunk_size: parseInt(e.target.value) || 1000 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Chunk Overlap</label>
              <input
                type="number"
                value={configB.chunk_overlap}
                onChange={(e) => setConfigB({ ...configB, chunk_overlap: parseInt(e.target.value) || 0 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Temperature</label>
              <input
                type="number"
                step="0.05"
                value={configB.temperature}
                onChange={(e) => setConfigB({ ...configB, temperature: parseFloat(e.target.value) || 0.0 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Top P</label>
              <input
                type="number"
                step="0.05"
                value={configB.top_p}
                onChange={(e) => setConfigB({ ...configB, top_p: parseFloat(e.target.value) || 0.0 })}
                className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Query Input & Presets */}
      <div className="glass-panel rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Parameter Simulation Query</label>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePresetQuery('summarize')}
              className="text-[10px] bg-[var(--bg-input)] border border-border-panel hover:border-indigo-500/25 text-indigo-650 dark:text-indigo-400 px-2.5 py-1.5 rounded transition-all font-semibold cursor-pointer"
            >
              Summarize Doc
            </button>
            <button
              onClick={() => handlePresetQuery('entities')}
              className="text-[10px] bg-[var(--bg-input)] border border-border-panel hover:border-indigo-500/25 text-indigo-650 dark:text-indigo-400 px-2.5 py-1.5 rounded transition-all font-semibold cursor-pointer"
            >
              Extract Entities
            </button>
            <button
              onClick={() => handlePresetQuery('email')}
              className="text-[10px] bg-[var(--bg-input)] border border-border-panel hover:border-indigo-500/25 text-indigo-650 dark:text-indigo-400 px-2.5 py-1.5 rounded transition-all font-semibold cursor-pointer"
            >
              Draft Email
            </button>
          </div>
        </div>

        <div className="flex space-x-3">
          <input
            type="text"
            placeholder="Ask a question about the document context (e.g. 'What is the liability cap in section 4?')..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 rounded bg-[var(--bg-input)] border border-border-panel p-3 text-sm text-text-app focus:border-indigo-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
          />
          <button
            onClick={handleSimulate}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white rounded px-6 py-3 font-semibold text-sm transition-all shadow-lg shadow-indigo-600/10 flex items-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <span>Simulating...</span>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Simulate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Side-by-Side Outputs */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Output Config A */}
          <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
            <div className="bg-indigo-500/5 border-b border-border-panel p-4 flex justify-between items-center text-xs">
              <span className="font-bold text-indigo-550 dark:text-indigo-400 flex items-center">
                <Sparkles className="h-4 w-4 mr-1 text-indigo-400" /> RUN A - OUTPUT
              </span>
              <div className="flex space-x-4">
                <span className="text-text-muted flex items-center"><Clock className="h-3 w-3 mr-1 text-emerald-500" /> {result.config_a_result.generation_time_ms} ms</span>
                <span className="text-text-muted flex items-center"><Cpu className="h-3 w-3 mr-1 text-indigo-400" /> {result.config_a_result.token_count} tokens</span>
              </div>
            </div>
            <div className="p-5 flex-1 min-h-[300px] bg-[var(--bg-input)]/50 text-text-app text-sm whitespace-pre-wrap font-sans leading-relaxed border-none">
              {result.config_a_result.response}
            </div>
            
            {/* Context Chunks A */}
            <div className="border-t border-border-panel bg-[var(--bg-panel)] p-4">
              <h4 className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider mb-2 flex items-center">
                <BookOpen className="h-3.5 w-3.5 mr-1 text-indigo-450" /> Source Context Chunks (Config A)
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {result.config_a_result.matching_chunks.map((chunk, i) => (
                  <div key={i} className="bg-[var(--bg-input)]/70 p-2.5 rounded border border-border-panel text-xs text-text-muted font-mono">
                    <div className="flex justify-between border-b border-border-panel pb-1 mb-1">
                      <span className="text-indigo-650 dark:text-indigo-400 font-semibold">Chunk #{chunk.chunk_index + 1}</span>
                      <span className="text-text-muted/65">Relevance: {chunk.score}</span>
                    </div>
                    {chunk.content}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Output Config B */}
          <div className="glass-panel rounded-xl overflow-hidden flex flex-col">
            <div className="bg-emerald-500/5 border-b border-border-panel p-4 flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-650 dark:text-emerald-400 flex items-center">
                <Sparkles className="h-4 w-4 mr-1 text-emerald-400" /> RUN B - OUTPUT
              </span>
              <div className="flex space-x-4">
                <span className="text-text-muted flex items-center"><Clock className="h-3 w-3 mr-1 text-emerald-500" /> {result.config_b_result.generation_time_ms} ms</span>
                <span className="text-text-muted flex items-center"><Cpu className="h-3 w-3 mr-1 text-indigo-400" /> {result.config_b_result.token_count} tokens</span>
              </div>
            </div>
            <div className="p-5 flex-1 min-h-[300px] bg-[var(--bg-input)]/50 text-text-app text-sm whitespace-pre-wrap font-sans leading-relaxed border-none">
              {result.config_b_result.response}
            </div>
            
            {/* Context Chunks B */}
            <div className="border-t border-border-panel bg-[var(--bg-panel)] p-4">
              <h4 className="text-xs font-semibold text-text-muted/60 uppercase tracking-wider mb-2 flex items-center">
                <BookOpen className="h-3.5 w-3.5 mr-1 text-emerald-450" /> Source Context Chunks (Config B)
              </h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {result.config_b_result.matching_chunks.map((chunk, i) => (
                  <div key={i} className="bg-[var(--bg-input)]/70 p-2.5 rounded border border-border-panel text-xs text-text-muted font-mono">
                    <div className="flex justify-between border-b border-border-panel pb-1 mb-1">
                      <span className="text-emerald-650 dark:text-emerald-400 font-semibold">Chunk #{chunk.chunk_index + 1}</span>
                      <span className="text-text-muted/65">Relevance: {chunk.score}</span>
                    </div>
                    {chunk.content}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
