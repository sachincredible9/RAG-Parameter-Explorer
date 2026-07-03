import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Upload, Trash2, Files, Sliders, CheckCircle, AlertCircle, Eye } from 'lucide-react';

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Chunking simulator settings
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [previewChunks, setPreviewChunks] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load documents
  async function loadDocuments() {
    setLoading(true);
    try {
      const res = await api.listDocuments();
      setDocuments(res.data);
      if (res.data.length > 0 && !selectedDoc) {
        // Load detail for the first document
        loadDocumentDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Error loading documents', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  // Update chunks preview when sliders or selected doc changes
  useEffect(() => {
    if (selectedDoc) {
      triggerChunkPreview(selectedDoc.content, chunkSize, chunkOverlap);
    }
  }, [chunkSize, chunkOverlap, selectedDoc]);

  async function loadDocumentDetail(docId) {
    try {
      const res = await api.getDocumentDetails(docId);
      setSelectedDoc(res.data);
    } catch (err) {
      console.error('Error fetching document details', err);
    }
  }

  async function triggerChunkPreview(content, size, overlap) {
    setPreviewLoading(true);
    try {
      const res = await api.getChunkPreview(content, size, overlap);
      setPreviewChunks(res.data.chunks);
    } catch (err) {
      console.error('Error fetching chunk preview', err);
    } finally {
      setPreviewLoading(false);
    }
  }

  // Handle upload
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.uploadDocument(file);
      setSuccess(`File "${file.name}" uploaded and parsed successfully!`);
      loadDocuments();
      // Load details for the newly uploaded file
      loadDocumentDetail(res.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  }

  // Handle delete
  async function handleDelete(docId, e) {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document and all its chunks?')) return;
    
    try {
      await api.deleteDocument(docId);
      setSuccess('Document deleted.');
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setPreviewChunks([]);
      }
      loadDocuments();
    } catch (err) {
      console.error('Error deleting document', err);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Sidebar: Upload & Documents List */}
      <div className="lg:col-span-4 space-y-6">
        <div className="glass-panel rounded-xl p-5">
          <h2 className="text-lg font-bold text-text-app mb-4 flex items-center">
            <Upload className="h-5 w-5 mr-2 text-indigo-400" /> Upload Source
          </h2>
          
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-border-panel hover:border-indigo-500/50 rounded-lg p-6 cursor-pointer bg-[var(--bg-input)]/40 transition-all">
            <Files className="h-10 w-10 text-text-muted/50 mb-2" />
            <span className="text-xs text-text-muted font-medium">Click to select PDF or TXT</span>
            <input
              type="file"
              accept=".txt,.pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>

          {uploading && <p className="text-xs text-text-muted mt-2 text-center">Parsing & chunking file...</p>}
          {error && <p className="text-xs text-red-400 mt-2 flex items-center"><AlertCircle className="h-3.5 w-3.5 mr-1" /> {error}</p>}
          {success && <p className="text-xs text-emerald-400 mt-2 flex items-center"><CheckCircle className="h-3.5 w-3.5 mr-1" /> {success}</p>}
        </div>

        <div className="glass-panel rounded-xl p-5">
          <h2 className="text-lg font-bold text-text-app mb-4">Document Library</h2>
          {loading ? (
            <p className="text-sm text-text-muted text-center">Loading library...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-text-muted/70 text-center py-4">No documents uploaded. Drag one above!</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => loadDocumentDetail(doc.id)}
                  className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedDoc?.id === doc.id
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-650 dark:text-indigo-200'
                      : 'border-border-panel bg-[var(--bg-input)]/60 hover:border-indigo-500/30 text-text-app'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="text-sm font-medium text-text-app truncate">{doc.name}</p>
                    <p className="text-xs text-text-muted uppercase mt-0.5">
                      {doc.file_type} • {(doc.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-1.5 text-text-muted hover:text-red-500 hover:bg-slate-500/10 rounded transition-all"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Visual Chunking Simulator */}
      <div className="lg:col-span-8 space-y-6">
        <div className="glass-panel rounded-xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border-panel pb-4">
            <div>
              <h2 className="text-xl font-bold text-text-app flex items-center">
                <Sliders className="h-5 w-5 mr-2 text-indigo-400" /> Visual Chunking Simulator
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Selected Document: <span className="text-text-app font-semibold">{selectedDoc?.name || 'None'}</span>
              </p>
            </div>
          </div>

          {!selectedDoc ? (
            <div className="p-12 text-center text-text-muted/60 font-medium">
              Select or upload a document to view real-time chunking configurations.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sliders Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-input)]/40 p-4 rounded-lg border border-border-panel">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted font-medium">Chunk Size (chars)</span>
                    <span className="text-indigo-500 dark:text-indigo-400 font-bold">{chunkSize}</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="3000"
                    step="50"
                    value={chunkSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setChunkSize(val);
                      if (chunkOverlap >= val) {
                        setChunkOverlap(val - 50);
                      }
                    }}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted/60">
                    <span>150</span>
                    <span>3,000</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted font-medium">Chunk Overlap (chars)</span>
                    <span className="text-emerald-500 dark:text-emerald-400 font-bold">{chunkOverlap}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.min(1000, chunkSize - 50)}
                    step="10"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted/60">
                    <span>0</span>
                    <span>{Math.min(1000, chunkSize - 50)}</span>
                  </div>
                </div>
              </div>

              {/* Chunk Highlights Grid */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-text-app uppercase tracking-wider">
                    Simulated Output Chunks ({previewChunks.length})
                  </h3>
                  <span className="text-xs bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-semibold">
                    Character Mode
                  </span>
                </div>

                {previewLoading ? (
                  <div className="p-12 text-center text-text-muted/70 animate-pulse">Updating visualization...</div>
                ) : (
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {previewChunks.map((chunk, index) => {
                      // Determine overlap regions visually
                      const hasOverlapBefore = index > 0 && chunkOverlap > 0;
                      const hasOverlapAfter = index < previewChunks.length - 1 && chunkOverlap > 0;
                      
                      const overlapBeforeContent = hasOverlapBefore 
                        ? chunk.content.slice(0, chunkOverlap) 
                        : '';
                      const mainContent = chunk.content.slice(
                        hasOverlapBefore ? chunkOverlap : 0, 
                        hasOverlapAfter ? chunk.content.length - chunkOverlap : chunk.content.length
                      );
                      const overlapAfterContent = hasOverlapAfter 
                        ? chunk.content.slice(chunk.content.length - chunkOverlap) 
                        : '';

                      return (
                        <div
                          key={chunk.chunk_index}
                          className="bg-[var(--bg-input)]/55 border border-border-panel rounded-lg p-4 space-y-2 hover:border-indigo-500/35 transition-all"
                        >
                          <div className="flex justify-between items-center text-xs border-b border-border-panel pb-2">
                            <span className="font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              Chunk #{chunk.chunk_index + 1}
                            </span>
                            <span className="text-text-muted">
                              Char Index: {chunk.start_char} - {chunk.end_char}
                            </span>
                          </div>
                          <p className="text-sm text-text-app leading-relaxed font-mono whitespace-pre-wrap select-all">
                            {hasOverlapBefore && (
                              <span className="bg-emerald-500/10 text-emerald-650 dark:text-emerald-300 border border-dashed border-emerald-500/30 rounded px-0.5 font-medium" title="Overlap with previous chunk">
                                {overlapBeforeContent}
                              </span>
                            )}
                            <span>{mainContent}</span>
                            {hasOverlapAfter && (
                              <span className="bg-blue-500/10 text-blue-650 dark:text-blue-300 border border-dashed border-blue-500/30 rounded px-0.5 font-medium" title="Overlap with next chunk">
                                {overlapAfterContent}
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
