import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Settings as SettingsIcon, Shield, Server, CheckCircle, HelpCircle } from 'lucide-react';

export default function Settings({ activeTenant }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState({
    custom_llm_enabled: false,
    custom_llm_url: '',
    custom_llm_key: '',
    custom_llm_model: '',
    default_model: 'gemini-1.5-flash',
    gemini_api_key: '',
    openai_api_key: ''
  });

  useEffect(() => {
    if (activeTenant) {
      // Map tenant settings or defaults
      const tenantSettings = activeTenant.settings || {};
      setSettings({
        custom_llm_enabled: tenantSettings.custom_llm_enabled || false,
        custom_llm_url: tenantSettings.custom_llm_url || '',
        custom_llm_key: tenantSettings.custom_llm_key || '',
        custom_llm_model: tenantSettings.custom_llm_model || '',
        default_model: tenantSettings.default_model || 'gemini-1.5-flash',
        gemini_api_key: tenantSettings.gemini_api_key || '',
        openai_api_key: tenantSettings.openai_api_key || ''
      });
      setSuccess('');
    }
  }, [activeTenant]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeTenant) return;
    
    setLoading(true);
    setSuccess('');
    try {
      await api.updateTenantSettings(activeTenant.id, settings);
      setSuccess('Tenant preferences saved successfully.');
      // Update local copy of tenant in active list if needed (handled in parent usually, or we can reload)
    } catch (err) {
      console.error('Failed to save settings', err);
      alert('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center space-x-2 border-b border-border-panel pb-4 mb-6">
          <SettingsIcon className="h-6 w-6 text-indigo-400" />
          <div>
            <h2 className="text-xl font-bold text-text-app">Tenant Configurations</h2>
            <p className="text-xs text-text-muted mt-1">
              Configure LLM endpoints, credentials, and default models for <span className="text-indigo-650 dark:text-indigo-400 font-semibold">{activeTenant?.name || 'Active Tenant'}</span>.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Custom LLM Integration */}
          <div className="border border-border-panel bg-[var(--bg-input)]/45 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-text-app">Custom LLM Endpoint / Gateway</h3>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.custom_llm_enabled}
                  onChange={(e) => setSettings({ ...settings, custom_llm_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[var(--border-input)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-slate-100"></div>
              </label>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              If enabled, DocMind will forward simulation queries directly to your custom LLM API instead of public endpoints. Ideal for hosting models on local gateways, Ollama, private AWS clusters, or corporate LLM gateways.
            </p>

            {settings.custom_llm_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Custom Endpoint URL</label>
                  <input
                    type="url"
                    placeholder="e.g. http://localhost:11434/v1/chat/completions or your private API url"
                    value={settings.custom_llm_url}
                    onChange={(e) => setSettings({ ...settings, custom_llm_url: e.target.value })}
                    className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
                    required={settings.custom_llm_enabled}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Custom API Key / Bearer Token</label>
                  <input
                    type="password"
                    placeholder="Leave blank if none required"
                    value={settings.custom_llm_key}
                    onChange={(e) => setSettings({ ...settings, custom_llm_key: e.target.value })}
                    className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Custom Model Identifier</label>
                  <input
                    type="text"
                    placeholder="e.g. llama3, custom-finetuned-v1"
                    value={settings.custom_llm_model}
                    onChange={(e) => setSettings({ ...settings, custom_llm_model: e.target.value })}
                    className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
                    required={settings.custom_llm_enabled}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Standard Providers */}
          <div className="border border-border-panel bg-[var(--bg-input)]/45 rounded-lg p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-text-app">Public Provider Credentials</h3>
            </div>
            <p className="text-xs text-text-muted">
              Provide authorization keys if you plan to test using official public endpoints. If left blank, DocMind will use default backend settings or fall back to high-fidelity mock simulation.
            </p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={settings.gemini_api_key}
                  onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                  className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={settings.openai_api_key}
                  onChange={(e) => setSettings({ ...settings, openai_api_key: e.target.value })}
                  className="w-full rounded bg-[var(--bg-input)] border border-border-panel p-2.5 text-xs text-text-app focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {success && (
            <p className="text-sm text-emerald-400 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              {success}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white rounded px-6 py-2.5 font-semibold text-sm transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              {loading ? 'Saving Settings...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
