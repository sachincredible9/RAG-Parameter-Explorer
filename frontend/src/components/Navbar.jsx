import React, { useState } from 'react';
import { Sparkles, Users, HelpCircle, Sun, Moon } from 'lucide-react';

export default function Navbar({ tenants, activeTenant, onTenantChange, theme, toggleTheme }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-panel bg-bg-app/85 backdrop-blur-md transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-6">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-650/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-text-app">DocMind Studio</h1>
            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">RAG Evaluation Suite</p>
          </div>
        </div>

        {/* Theme Toggle & Tenant Switch Selector & Mock Auth */}
        <div className="flex items-center space-x-4">
          {/* Light/Dark Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-border-panel hover:bg-slate-500/10 text-text-muted hover:text-text-app transition-all cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-650" />
            )}
          </button>

          {/* Tenant Switcher */}
          <div className="flex items-center space-x-2 bg-[var(--bg-panel)] border border-border-panel rounded-lg px-3 py-1.5 transition-colors duration-200">
            <Users className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-text-muted">Tenant Workspace:</span>
            
            <select
              value={activeTenant?.id || ''}
              onChange={(e) => onTenantChange(e.target.value)}
              className="bg-transparent text-xs text-text-app font-bold focus:outline-none border-none cursor-pointer pr-1"
            >
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id} className="bg-[var(--bg-input)] text-text-app">
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          {/* Help Info Tooltip */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-1 text-text-muted hover:text-text-app cursor-pointer"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 mt-2 w-64 p-3 rounded-lg border border-border-panel bg-[var(--bg-input)] text-xs text-text-muted shadow-xl z-50 leading-relaxed font-normal">
                <span className="font-semibold text-text-app block mb-1">Mock Authentication Mode</span>
                Selecting a tenant automatically injects its workspace context. Data isolation is enforced using database-level headers. Configure API keys per-tenant in Settings.
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
