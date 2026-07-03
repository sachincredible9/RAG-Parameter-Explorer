import React, { useState, useEffect } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import DocumentLibrary from './components/DocumentLibrary';
import PersonaBuilder from './components/PersonaBuilder';
import SimulatorPlayground from './components/SimulatorPlayground';
import Settings from './components/Settings';
import { LayoutDashboard, Files, UserCog, Sliders, Settings as SettingsIcon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tenants, setTenants] = useState([]);
  const [activeTenant, setActiveTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('docmind_theme');
    return saved || 'dark';
  });

  // Sync theme selection to document element class list
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('docmind_theme', next);
      return next;
    });
  };

  // Load available tenants
  useEffect(() => {
    async function loadTenants() {
      setLoading(true);
      try {
        const res = await api.listTenants();
        setTenants(res.data);
        if (res.data.length > 0) {
          // Check local storage
          const savedId = localStorage.getItem('docmind_tenant_id');
          const matching = res.data.find(t => t.id === savedId);
          const defaultTenant = matching || res.data[0];
          setActiveTenant(defaultTenant);
          localStorage.setItem('docmind_tenant_id', defaultTenant.id);
        }
      } catch (err) {
        console.error('Error fetching tenants on app mount', err);
      } finally {
        setLoading(false);
      }
    }
    loadTenants();
  }, []);

  const handleTenantChange = (tenantId) => {
    const selected = tenants.find(t => t.id === tenantId);
    if (selected) {
      setActiveTenant(selected);
      localStorage.setItem('docmind_tenant_id', selected.id);
      // Hard reload or state update to refresh all contexts
      window.location.reload();
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Document Library', icon: Files },
    { id: 'personas', label: 'Persona Builder', icon: UserCog },
    { id: 'playground', label: 'Simulator Playground', icon: Sliders },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-app">
        <div className="text-text-muted font-medium animate-pulse">Initializing DocMind Workspace...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app text-text-app flex flex-col transition-colors duration-200">
      <Navbar
        tenants={tenants}
        activeTenant={activeTenant}
        onTenantChange={handleTenantChange}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-border-panel bg-[var(--bg-sidebar)] hidden md:block transition-colors duration-200">
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/10'
                      : 'text-text-muted hover:text-text-app hover:bg-slate-500/10'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'documents' && <DocumentLibrary />}
          {activeTab === 'personas' && <PersonaBuilder />}
          {activeTab === 'playground' && <SimulatorPlayground />}
          {activeTab === 'settings' && <Settings activeTenant={activeTenant} />}
        </main>
      </div>
    </div>
  );
}
