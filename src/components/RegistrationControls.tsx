import React from 'react';
import { TransformMatrix } from '../types/lunar';
import { 
  Sliders, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Move, 
  Crosshair, 
  Settings2,
  Info
} from 'lucide-react';

interface RegistrationControlsProps {
  filterMode: 'raw' | 'phase_congruency' | 'clahe' | 'edge_log';
  setFilterMode: (mode: 'raw' | 'phase_congruency' | 'clahe' | 'edge_log') => void;
  matcherType: 'ai_invariant' | 'classical_sift' | 'orb_fast';
  setMatcherType: (matcher: 'ai_invariant' | 'classical_sift' | 'orb_fast') => void;
  transformModel: 'Rigid' | 'Similarity' | 'Affine' | 'Homography' | 'TPS';
  setTransformModel: (model: 'Rigid' | 'Similarity' | 'Affine' | 'Homography' | 'TPS') => void;
  useQuadTreeGrid: boolean;
  setUseQuadTreeGrid: (val: boolean) => void;
  enableSubPixel: boolean;
  setEnableSubPixel: (val: boolean) => void;
  ransacThreshold: number;
  setRansacThreshold: (val: number) => void;
  transform: TransformMatrix;
}

export const RegistrationControls: React.FC<RegistrationControlsProps> = ({
  filterMode,
  setFilterMode,
  matcherType,
  setMatcherType,
  transformModel,
  setTransformModel,
  useQuadTreeGrid,
  setUseQuadTreeGrid,
  enableSubPixel,
  setEnableSubPixel,
  ransacThreshold,
  setRansacThreshold,
  transform,
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          Planetary Image Registration Hyperparameters
        </h3>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
          Matrix: 3x3 {transform.type}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pre-Processing Filter */}
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1. Illumination Normalization
            </label>
            <p className="text-[10px] text-slate-400 mb-2">
              Phase Congruency isolates frequency edges invariant to shadow shifts.
            </p>
          </div>

          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="phase_congruency">Phase Congruency (Invariant Wavelet)</option>
            <option value="clahe">CLAHE (Adaptive Histogram)</option>
            <option value="edge_log">Laplacian of Gaussian (LoG)</option>
            <option value="raw">Raw Panchromatic / Optical</option>
          </select>
        </div>

        {/* Feature Matcher Engine */}
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              2. Correspondence Matcher
            </label>
            <p className="text-[10px] text-slate-400 mb-2">
              AI Cross-Attention maintains match stability across scale & sun angle.
            </p>
          </div>

          <select
            value={matcherType}
            onChange={(e) => setMatcherType(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
          >
            <option value="ai_invariant">Proposed AI Cross-Attention (Robust)</option>
            <option value="classical_sift">Classical SIFT (Degrades with Sun Angle)</option>
            <option value="orb_fast">ORB Binary (Fails with Scale Disparity)</option>
          </select>
        </div>

        {/* Outlier Rejection & Quad-Tree */}
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              3. Spatial Uniform Grid Binning
            </label>
            <p className="text-[10px] text-slate-400 mb-2">
              Quad-tree enforces tie-points uniformly across all 4 quadrants.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setUseQuadTreeGrid(!useQuadTreeGrid)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono transition ${
                useQuadTreeGrid
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {useQuadTreeGrid ? 'Quad-Tree: ENFORCED' : 'Uniform: DISABLED'}
            </button>

            <span className="text-[10px] font-mono text-slate-400">
              RANSAC: {ransacThreshold}px
            </span>
          </div>
        </div>

        {/* Geometric Model & Sub-Pixel */}
        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
              4. Sub-Pixel Precision Engine
            </label>
            <p className="text-[10px] text-slate-400 mb-2">
              2D Quadratic parabolic surface fitting achieves sub-0.15 px RMSE.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={transformModel}
              onChange={(e) => setTransformModel(e.target.value as any)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="Homography">Projective / Homography</option>
              <option value="Affine">Affine (6-DOF)</option>
              <option value="Similarity">Similarity (4-DOF)</option>
              <option value="TPS">Thin Plate Spline (TPS)</option>
            </select>

            <button
              onClick={() => setEnableSubPixel(!enableSubPixel)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition ${
                enableSubPixel
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {enableSubPixel ? '<0.15 px' : 'Integer'}
            </button>
          </div>
        </div>
      </div>

      {/* Homography Matrix Telemetry Strip */}
      <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Estimated H-Matrix:</span>
          <span className="text-cyan-300">
            [{transform.matrix[0][0].toFixed(3)}, {transform.matrix[0][1].toFixed(3)}, {transform.translationX.toFixed(1)}]
          </span>
          <span className="text-cyan-300">
            [{transform.matrix[1][0].toFixed(3)}, {transform.matrix[1][1].toFixed(3)}, {transform.translationY.toFixed(1)}]
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>Rotation: <strong className="text-slate-200">{transform.rotationDeg.toFixed(2)}°</strong></span>
          <span>Scale: <strong className="text-slate-200">{transform.scaleX.toFixed(3)}x</strong></span>
          <span>Shift: <strong className="text-slate-200">({transform.translationX.toFixed(1)}, {transform.translationY.toFixed(1)}) px</strong></span>
        </div>
      </div>
    </div>
  );
};
