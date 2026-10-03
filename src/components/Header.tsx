import React from 'react';
import { 
  Orbit, 
  Satellite, 
  Sparkles, 
  Layers, 
  Sun, 
  SlidersHorizontal, 
  FileText, 
  HelpCircle,
  Cpu,
  CheckCircle2,
  Compass
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'workbench' | 'sandbox' | 'metrics' | 'export';
  setActiveTab: (tab: 'workbench' | 'sandbox' | 'metrics' | 'export') => void;
  openApjChat: () => void;
  rmseVal: number;
  inlierRatio: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openApjChat,
  rmseVal,
  inlierRatio,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Mission Title */}
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-indigo-500/20 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Orbit className="w-5 h-5 text-cyan-400 animate-spin-slow" />
              <div className="absolute w-2 h-2 rounded-full bg-cyan-400 -top-0.5 -right-0.5 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  ISRO • SAC
                </span>
                <span className="text-xs font-mono tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  SIH 2026
                </span>
                <span className="hidden md:inline-flex text-[11px] font-mono text-slate-400 items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CH-2 REAL-TIME ENGINE
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                CH-2 LunarMatch
                <span className="text-xs font-normal text-slate-400 hidden lg:inline">
                  | Multi-Modal, Sun-Angle & Scale Invariant Correspondence
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('workbench')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'workbench'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Registration Workbench
            </button>

            <button
              onClick={() => setActiveTab('sandbox')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'sandbox'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Sun-Angle & Scale Sandbox
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'metrics'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Scientific Metrics
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              PDS4 / CSV Export
            </button>
          </nav>

          {/* Quick Stats & APJ Assistant Launcher */}
          <div className="flex items-center gap-3">
            <div className="hidden xl:flex items-center gap-3 px-3 py-1 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>RMSE: {rmseVal.toFixed(3)} px</span>
              </div>
              <div className="w-px h-3 bg-slate-800" />
              <div className="text-cyan-400">
                <span>Inliers: {inlierRatio}%</span>
              </div>
            </div>

            <button
              onClick={openApjChat}
              className="relative group flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-cyan-500/20 border border-amber-500/40 text-amber-200 hover:border-amber-400 text-xs font-medium transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-95"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute -top-0.5 -right-0.5" />
              <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span className="font-semibold tracking-wide">APJ Lunar AI</span>
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-900 text-xs">
          <button
            onClick={() => setActiveTab('workbench')}
            className={`py-1 px-2 rounded ${activeTab === 'workbench' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Workbench
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`py-1 px-2 rounded ${activeTab === 'sandbox' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Sandbox
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-1 px-2 rounded ${activeTab === 'metrics' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Metrics
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-1 px-2 rounded ${activeTab === 'export' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            Export
          </button>
        </div>
      </div>
    </header>
  );
};
