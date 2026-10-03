import React from 'react';
import { PipelineStage } from '../types/lunar';
import { 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  Cpu, 
  Crosshair, 
  ShieldCheck, 
  Move, 
  Sparkles, 
  FileCheck
} from 'lucide-react';

interface PipelineStepperProps {
  currentStage: PipelineStage;
  onSelectStage: (stage: PipelineStage) => void;
  isRunningPipeline: boolean;
  onRunEndToEnd: () => void;
  onReset: () => void;
}

const STAGES: { id: PipelineStage; stepNum: string; label: string; icon: any; desc: string }[] = [
  { id: 'acquisition', stepNum: '01', label: 'Acquisition', icon: Sliders, desc: 'OHRC / TMC-2 / IIRS Ingestion' },
  { id: 'preprocessing', stepNum: '02', label: 'Pre-processing', icon: Sparkles, desc: 'Phase Congruency & Retinex' },
  { id: 'feature_detection', stepNum: '03', label: 'Feature Detection', icon: Crosshair, desc: 'Craters, Rims & Micro-Boulders' },
  { id: 'ai_matching', stepNum: '04', label: 'AI Matching', icon: Cpu, desc: 'Cross-Modal Invariant Attention' },
  { id: 'validation', stepNum: '05', label: 'Validation', icon: ShieldCheck, desc: 'RANSAC & Uniform Quad-Tree' },
  { id: 'registration', stepNum: '06', label: 'Registration', icon: Move, desc: 'Homography & Affine Warp' },
  { id: 'subpixel_refinement', stepNum: '07', label: 'Sub-Pixel Refinement', icon: Crosshair, desc: 'Quadratic Peak Fit (<0.20 px)' },
  { id: 'registered_product', stepNum: '08', label: 'Registered Product', icon: FileCheck, desc: 'Validated Mosaic & Metrics' },
];

export const PipelineStepper: React.FC<PipelineStepperProps> = ({
  currentStage,
  onSelectStage,
  isRunningPipeline,
  onRunEndToEnd,
  onReset,
}) => {
  const currentStageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            ISRO 8-Stage Lunar Correspondence Pipeline
          </h3>
          <p className="text-[11px] text-slate-400">
            Click any step to inspect intermediate representations or run the full automated registration sequence.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onReset}
            disabled={isRunningPipeline}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={onRunEndToEnd}
            disabled={isRunningPipeline}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isRunningPipeline ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Executing Pipeline...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run End-to-End Registration
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        {STAGES.map((st, idx) => {
          const isActive = st.id === currentStage;
          const isCompleted = idx < currentStageIndex;
          const Icon = st.icon;

          return (
            <button
              key={st.id}
              onClick={() => onSelectStage(st.id)}
              disabled={isRunningPipeline}
              className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between relative group ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-400/80 text-cyan-200 ring-1 ring-cyan-500/40 shadow-sm'
                  : isCompleted
                  ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  : 'bg-slate-950/30 border-slate-900 text-slate-500 hover:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold ${
                  isActive ? 'text-cyan-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {st.stepNum}
                </span>

                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold block leading-tight truncate">
                  {st.label}
                </span>
                <span className="text-[9px] text-slate-400 block truncate mt-0.5 font-mono">
                  {st.desc}
                </span>
              </div>

              {isActive && (
                <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-cyan-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
