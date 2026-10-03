import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  CorrespondencePoint, 
  LunarDatasetPair, 
  PipelineMetrics, 
  PipelineStage, 
  TransformMatrix, 
  ViewMode 
} from '../types/lunar';
import { renderLunarSurface } from '../utils/lunarAlgorithms';
import { 
  Sun, 
  Sparkles, 
  ShieldCheck, 
  Maximize2, 
  Zap, 
  RotateCw, 
  Activity, 
  Layers, 
  Eye, 
  EyeOff, 
  Grid, 
  Sliders, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  Target, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Cpu,
  Download
} from 'lucide-react';

interface MissionControlWorkstationProps {
  dataset: LunarDatasetPair;
  datasets: LunarDatasetPair[];
  onSelectDataset: (ds: LunarDatasetPair) => void;
  currentStage: PipelineStage;
  onRunPipeline: () => void;
  isRunningPipeline: boolean;
  points: CorrespondencePoint[];
  metrics: PipelineMetrics;
  transform: TransformMatrix;
  filterMode: 'raw' | 'phase_congruency' | 'clahe' | 'edge_log';
  setFilterMode: (m: 'raw' | 'phase_congruency' | 'clahe' | 'edge_log') => void;
  matcherType: 'ai_invariant' | 'classical_sift' | 'orb_fast';
  setMatcherType: (m: 'ai_invariant' | 'classical_sift' | 'orb_fast') => void;
  transformModel: 'Rigid' | 'Similarity' | 'Affine' | 'Homography' | 'TPS';
  setTransformModel: (t: 'Rigid' | 'Similarity' | 'Affine' | 'Homography' | 'TPS') => void;
  useQuadTreeGrid: boolean;
  setUseQuadTreeGrid: (v: boolean) => void;
  enableSubPixel: boolean;
  setEnableSubPixel: (v: boolean) => void;
  ransacThreshold: number;
  setRansacThreshold: (v: number) => void;
  onOpenIngestionModal: () => void;
  onOpenApjChat: () => void;
}

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 460;

export const MissionControlWorkstation: React.FC<MissionControlWorkstationProps> = ({
  dataset,
  datasets,
  onSelectDataset,
  currentStage,
  onRunPipeline,
  isRunningPipeline,
  points,
  metrics,
  transform,
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
  onOpenIngestionModal,
  onOpenApjChat,
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('side_by_side');
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showOutliers, setShowOutliers] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [curtainPos, setCurtainPos] = useState<number>(0.5);
  const [isDraggingCurtain, setIsDraggingCurtain] = useState<boolean>(false);
  const [flickerState, setFlickerState] = useState<'source' | 'ref'>('source');

  // Accordion open/close states
  const [openSection, setOpenSection] = useState<string | null>('sun');

  // Selected tie-point for inspector
  const [selectedPoint, setSelectedPoint] = useState<CorrespondencePoint | null>(null);

  // Hidden and visible canvas refs
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const registeredCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visibleSourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visibleRefCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayVectorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Refresh display canvases from offscreen buffers
  const refreshDisplayCanvases = useCallback(() => {
    if (visibleSourceCanvasRef.current && sourceCanvasRef.current) {
      const ctx = visibleSourceCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx?.drawImage(sourceCanvasRef.current, 0, 0);
    }
    if (visibleRefCanvasRef.current && refCanvasRef.current) {
      const ctx = visibleRefCanvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx?.drawImage(refCanvasRef.current, 0, 0);
    }
  }, []);

  // Render base lunar images
  useEffect(() => {
    // 1. Direct render to visible DOM canvases
    if (visibleSourceCanvasRef.current) {
      renderLunarSurface(
        visibleSourceCanvasRef.current,
        dataset.seed,
        dataset.sourceMeta,
        filterMode,
        undefined,
        dataset.sourceImageUrl
      );
    }

    if (visibleRefCanvasRef.current) {
      renderLunarSurface(
        visibleRefCanvasRef.current,
        dataset.seed,
        dataset.refMeta,
        filterMode,
        undefined,
        dataset.refImageUrl
      );
    }

    // 2. Offscreen buffers for composite modes
    if (sourceCanvasRef.current) {
      renderLunarSurface(
        sourceCanvasRef.current,
        dataset.seed,
        dataset.sourceMeta,
        filterMode,
        undefined,
        dataset.sourceImageUrl
      );
    }

    if (refCanvasRef.current) {
      renderLunarSurface(
        refCanvasRef.current,
        dataset.seed,
        dataset.refMeta,
        filterMode,
        undefined,
        dataset.refImageUrl
      );
    }

    if (registeredCanvasRef.current) {
      const isRegistered = currentStage === 'registration' || currentStage === 'subpixel_refinement' || currentStage === 'registered_product';
      renderLunarSurface(
        registeredCanvasRef.current,
        dataset.seed,
        dataset.sourceMeta,
        filterMode,
        isRegistered ? transform : undefined,
        dataset.sourceImageUrl
      );
    }
  }, [dataset, filterMode, currentStage, transform]);

  // Handle composite canvas rendering for Curtain, Checkerboard, Difference Heatmap & Flicker
  useEffect(() => {
    const compCanvas = compositeCanvasRef.current;
    const refCanvas = refCanvasRef.current;
    const regCanvas = registeredCanvasRef.current;
    if (!compCanvas || !refCanvas || !regCanvas) return;

    const ctx = compCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (viewMode === 'curtain_split') {
      const splitX = Math.floor(CANVAS_WIDTH * curtainPos);
      ctx.drawImage(refCanvas, 0, 0);

      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, CANVAS_WIDTH - splitX, CANVAS_HEIGHT);
      ctx.clip();
      ctx.drawImage(regCanvas, 0, 0);
      ctx.restore();

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, CANVAS_HEIGHT);
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(splitX, CANVAS_HEIGHT / 2, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (viewMode === 'checkerboard') {
      const tileSize = 52;
      for (let y = 0; y < CANVAS_HEIGHT; y += tileSize) {
        for (let x = 0; x < CANVAS_WIDTH; x += tileSize) {
          const isEven = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
          const srcToDraw = isEven ? refCanvas : regCanvas;
          ctx.drawImage(srcToDraw, x, y, tileSize, tileSize, x, y, tileSize, tileSize);
        }
      }
    } else if (viewMode === 'difference_heatmap') {
      const refCtx = refCanvas.getContext('2d');
      const regCtx = regCanvas.getContext('2d');
      if (refCtx && regCtx) {
        const refImg = refCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const regImg = regCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const diffImg = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);

        for (let i = 0; i < refImg.data.length; i += 4) {
          const diff = Math.abs(regImg.data[i] - refImg.data[i]);
          if (diff < 15) {
            diffImg.data[i] = 8;
            diffImg.data[i + 1] = 16;
            diffImg.data[i + 2] = 50 + diff * 3;
          } else if (diff < 55) {
            diffImg.data[i] = 10;
            diffImg.data[i + 1] = Math.min(255, 120 + diff * 2);
            diffImg.data[i + 2] = 220;
          } else {
            diffImg.data[i] = Math.min(255, 170 + diff);
            diffImg.data[i + 1] = Math.max(0, 200 - diff);
            diffImg.data[i + 2] = 30;
          }
          diffImg.data[i + 3] = 255;
        }
        ctx.putImageData(diffImg, 0, 0);
      }
    } else if (viewMode === 'flicker_comparator') {
      const toDraw = flickerState === 'source' ? regCanvas : refCanvas;
      ctx.drawImage(toDraw, 0, 0);
    }
  }, [viewMode, curtainPos, flickerState, dataset, filterMode, currentStage, transform]);

  // Flicker comparator loop
  useEffect(() => {
    if (viewMode !== 'flicker_comparator') return;
    const interval = setInterval(() => {
      setFlickerState((p) => (p === 'source' ? 'ref' : 'source'));
    }, 380);
    return () => clearInterval(interval);
  }, [viewMode]);

  // Draw Tie-Point Vectors matching Image 3 style
  useEffect(() => {
    const canvas = overlayVectorCanvasRef.current;
    if (!canvas || viewMode !== 'side_by_side') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Quad-Tree Grid if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

      const refOffset = CANVAS_WIDTH + 20;
      ctx.strokeRect(refOffset, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(refOffset + CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(refOffset, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(refOffset + CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.setLineDash([]);
    }

    if (!showVectors) return;

    const refOffset = CANVAS_WIDTH + 20;

    // Draw matching lines and points exactly matching Image 3 (cyan solid for inliers, dashed red for horizontal tie-lines)
    points.forEach((pt, index) => {
      if (!showOutliers && !pt.inlier) return;

      const isSelected = selectedPoint?.id === pt.id;
      const x1 = pt.srcX;
      const y1 = pt.srcY;
      const x2 = refOffset + pt.refX;
      const y2 = pt.refY;

      // Draw horizontal match ray
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (pt.inlier) {
        // High-confidence verified inlier matches: solid cyan ray
        if (index % 4 === 0 || isSelected) {
          ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(6, 182, 212, 0.75)';
          ctx.lineWidth = isSelected ? 2.5 : 1.4;
          ctx.setLineDash([]);
        } else {
          // Subtle dashed epipolar red guide line
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 0.9;
          ctx.setLineDash([2, 3]);
        }
      } else {
        // Rejected outlier
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 4]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Source keypoint marker (Red dot like reference screenshot)
      ctx.fillStyle = pt.inlier ? '#ef4444' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(x1, y1, isSelected ? 4.5 : 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Cyan halo ring for key inliers (matching screenshot's cyan circle rings)
      if (pt.inlier && (index % 4 === 0 || isSelected)) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x1, y1, 5.0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Reference keypoint marker (Red dot)
      ctx.fillStyle = pt.inlier ? '#ef4444' : '#f43f5e';
      ctx.beginPath();
      ctx.arc(x2, y2, isSelected ? 4.5 : 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Cyan halo ring on reference side for key inliers
      if (pt.inlier && (index % 4 === 0 || isSelected)) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(x2, y2, 5.0, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [points, showVectors, showOutliers, showGrid, selectedPoint, viewMode]);

  // Click on vector overlay to select point
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const refOffset = CANVAS_WIDTH + 20;

    let closest: CorrespondencePoint | null = null;
    let minDist = 14;

    for (const pt of points) {
      const d1 = Math.hypot(clickX - pt.srcX, clickY - pt.srcY);
      const d2 = Math.hypot(clickX - (refOffset + pt.refX), clickY - pt.refY);
      const d = Math.min(d1, d2);
      if (d < minDist) {
        minDist = d;
        closest = pt;
      }
    }
    setSelectedPoint(closest);
  };

  const toggleSection = (s: string) => {
    setOpenSection(openSection === s ? null : s);
  };

  return (
    <div className="w-full flex flex-col gap-3 font-mono text-slate-200">
      
      {/* Top Console Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050a14] border border-slate-800/90 px-4 py-2.5 rounded-2xl shadow-xl">
        {/* Left: View Mode Selectors */}
        <div className="flex items-center gap-1 bg-[#091122] p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setViewMode('side_by_side')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'side_by_side'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Match Vectors
          </button>
          <button
            onClick={() => setViewMode('curtain_split')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'curtain_split'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wipe Curtain
          </button>
          <button
            onClick={() => setViewMode('checkerboard')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'checkerboard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Checkerboard
          </button>
          <button
            onClick={() => setViewMode('difference_heatmap')}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewMode === 'difference_heatmap'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Residual Heatmap
          </button>
          <button
            onClick={() => setViewMode('flicker_comparator')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
              viewMode === 'flicker_comparator'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            Blink
          </button>
        </div>

        {/* Center: Overlays toggles */}
        <div className="flex items-center gap-2 text-xs">
          {viewMode === 'side_by_side' && (
            <>
              <button
                onClick={() => setShowVectors(!showVectors)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition flex items-center gap-1.5 ${
                  showVectors ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {showVectors ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Vectors ({points.filter((p) => p.inlier).length})
              </button>

              <button
                onClick={() => setShowOutliers(!showOutliers)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition flex items-center gap-1.5 ${
                  showOutliers ? 'bg-rose-500/15 text-rose-300 border-rose-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                Outliers ({points.filter((p) => !p.inlier).length})
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition flex items-center gap-1.5 ${
                  showGrid ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Uniform Grid
              </button>
            </>
          )}
        </div>

        {/* Right: Modal & Assistant buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenIngestionModal}
            className="px-3 py-1.5 rounded-xl bg-[#091528] hover:bg-[#0c1f3d] text-cyan-300 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Ingest Catalogs &amp; Pair</span>
          </button>
        </div>
      </div>

      {/* Main Mission Control Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* LEFT COLUMN: Datasets & Pipeline Accordions (Matching Reference Screenshot 3) */}
        <div className="lg:col-span-3 flex flex-col gap-2.5">
          {/* 4 Fast Dataset Selectors matching Screenshot 3 */}
          <div className="space-y-1.5">
            {datasets.slice(0, 4).map((ds) => {
              const isActive = ds.id === dataset.id;
              return (
                <button
                  key={ds.id}
                  onClick={() => onSelectDataset(ds)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all relative ${
                    isActive
                      ? 'bg-[#091528] border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                      : 'bg-[#050a14] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="truncate">{ds.title}</span>
                    {isActive && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5 flex items-center justify-between">
                    <span>{ds.sourceMeta.sensor} ({ds.sourceMeta.resolutionMetersPerPixel}m)</span>
                    <span>➔ {ds.refMeta.sensor} ({ds.refMeta.resolutionMetersPerPixel}m)</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mission Briefing Card matching Screenshot 3 */}
          <div className="bg-[#050a14] p-3 rounded-xl border border-slate-800 text-xs">
            <span className="text-cyan-400 font-bold block mb-1">Mission Context:</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {dataset.description}
            </p>
          </div>

          {/* Collapsible Accordions matching Screenshot 3 */}
          <div className="bg-[#050a14] rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
            
            {/* 02. SUN-ANGLE NORMALIZATION */}
            <div>
              <button
                onClick={() => toggleSection('sun')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900/60 transition"
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  02. SUN-ANGLE NORMALIZATION
                </span>
                {openSection === 'sun' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'sun' && (
                <div className="p-3 bg-[#030712] text-xs space-y-2.5 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                      Illumination Invariant Filter:
                    </label>
                    <select
                      value={filterMode}
                      onChange={(e) => setFilterMode(e.target.value as any)}
                      className="w-full bg-[#081020] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-500"
                    >
                      <option value="phase_congruency">Phase Congruency (Shadow Invariant)</option>
                      <option value="clahe">Adaptive CLAHE Contrast</option>
                      <option value="edge_log">LoG Curvature Filter</option>
                      <option value="raw">Raw Optical / Panchromatic</option>
                    </select>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono">
                    ✓ Strips deceptive shadow bias; isolates true rim morphology.
                  </div>
                </div>
              )}
            </div>

            {/* 03. FEATURE REPRESENTATION */}
            <div>
              <button
                onClick={() => toggleSection('feature')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900/60 transition"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  03. FEATURE REPRESENTATION
                </span>
                {openSection === 'feature' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'feature' && (
                <div className="p-3 bg-[#030712] text-xs space-y-2.5 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-mono">
                      Correspondence Matcher Engine:
                    </label>
                    <select
                      value={matcherType}
                      onChange={(e) => setMatcherType(e.target.value as any)}
                      className="w-full bg-[#081020] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-500"
                    >
                      <option value="ai_invariant">AI Cross-Attention (Proposed Engine)</option>
                      <option value="classical_sift">Classical SIFT Baseline</option>
                      <option value="orb_fast">ORB Binary Matcher</option>
                    </select>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Extracts multi-scale craters, boulder clusters, and ridgelines across scale jumps.
                  </div>
                </div>
              )}
            </div>

            {/* 04. RANSAC & REGISTRATION */}
            <div>
              <button
                onClick={() => toggleSection('ransac')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900/60 transition"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  04. RANSAC &amp; REGISTRATION
                </span>
                {openSection === 'ransac' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'ransac' && (
                <div className="p-3 bg-[#030712] text-xs space-y-2.5 border-t border-slate-800">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">RANSAC Outlier Rejection:</span>
                    <span className="text-cyan-400">{ransacThreshold} px</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={ransacThreshold}
                    onChange={(e) => setRansacThreshold(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />

                  <div className="pt-1">
                    <button
                      onClick={() => setUseQuadTreeGrid(!useQuadTreeGrid)}
                      className={`w-full py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                        useQuadTreeGrid ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      Quad-Tree Uniformity: {useQuadTreeGrid ? 'ENFORCED (96%)' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="pt-1">
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Transformation Model:
                    </label>
                    <select
                      value={transformModel}
                      onChange={(e) => setTransformModel(e.target.value as any)}
                      className="w-full bg-[#081020] border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono"
                    >
                      <option value="Homography">Projective / Homography (8-DOF)</option>
                      <option value="Affine">Affine (6-DOF)</option>
                      <option value="Similarity">Similarity (4-DOF)</option>
                      <option value="TPS">Thin Plate Spline (TPS)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 05. SUB-PIXEL REFINEMENT */}
            <div>
              <button
                onClick={() => toggleSection('subpixel')}
                className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-slate-200 hover:bg-slate-900/60 transition"
              >
                <span className="flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-purple-400" />
                  05. SUB-PIXEL REFINEMENT
                </span>
                {openSection === 'subpixel' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {openSection === 'subpixel' && (
                <div className="p-3 bg-[#030712] text-xs space-y-2 border-t border-slate-800">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Precision Fitting:</span>
                    <strong className="text-emerald-400">&lt; 0.15 px RMSE</strong>
                  </div>
                  <div className="bg-[#081020] p-2 rounded-lg border border-slate-800 text-[10px] space-y-1">
                    <div className="text-slate-400">Ground Accuracy: <strong className="text-cyan-300">{metrics.rmseMeters.toFixed(3)} m</strong></div>
                    <div className="text-slate-400">Biquadratic Taylor peak fitting enabled.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RUN REGISTRATION PIPELINE Action Button matching Screenshot 3 */}
          <button
            onClick={onRunPipeline}
            disabled={isRunningPipeline}
            className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isRunningPipeline ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>EXECUTING 8-STAGE REGISTRATION...</span>
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4 stroke-[3]" />
                <span>RUN REGISTRATION PIPELINE</span>
              </>
            )}
          </button>
        </div>

        {/* RIGHT COLUMN: Dual Main Canvases & Cartographic Reference (Matching Screenshot 3) */}
        <div className="lg:col-span-9 flex flex-col gap-2.5">
          {/* Main Dual Canvases Container with dark spatial coordinate grid */}
          <div className="relative bg-[#030712] border border-slate-800 rounded-2xl p-3 shadow-2xl overflow-x-auto min-h-[500px] flex items-center justify-center">
            {/* Hidden buffers */}
            <canvas ref={sourceCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
            <canvas ref={refCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
            <canvas ref={registeredCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />

            {/* Mode 1: Dual Side-by-Side (Exact Replica of Reference Screenshot 3) */}
            {viewMode === 'side_by_side' && (
              <div className="relative flex items-center gap-5">
                
                {/* SOURCE (MOVING) VIEWPORT */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-1 text-[11px] font-mono px-1">
                    <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      SOURCE (MOVING): {dataset.sourceMeta.sensor} [{dataset.sourceMeta.resolutionMetersPerPixel}m]
                    </span>
                    <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                      SUN AZ: {dataset.sourceMeta.sunAzimuthDeg}° • EL: {dataset.sourceMeta.sunElevationDeg}°
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                    <canvas
                      ref={visibleSourceCanvasRef}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      className="bg-black block"
                    />
                  </div>
                </div>

                {/* REFERENCE (FIXED) VIEWPORT WITH CARTOGRAPHIC OVERLAYS */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-between w-full mb-1 text-[11px] font-mono px-1">
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      REFERENCE (FIXED): {dataset.refMeta.sensor} [{dataset.refMeta.resolutionMetersPerPixel}m]
                    </span>
                    <span className="text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                      SUN AZ: {dataset.refMeta.sunAzimuthDeg}° • EL: {dataset.refMeta.sunElevationDeg}°
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-inner">
                    <canvas
                      ref={visibleRefCanvasRef}
                      width={CANVAS_WIDTH}
                      height={CANVAS_HEIGHT}
                      className="bg-black block"
                    />

                    {/* Cartographic Coordinate & Scale Bar Legend matching Screenshot 3 bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm border-t border-slate-800 px-3 py-1 flex items-center justify-between text-[9px] font-mono text-slate-300">
                      <div>
                        <span>NASA / LRO / NAC Reference Imagery</span>
                        <span className="mx-2 text-slate-600">|</span>
                        <span>TARGET: {dataset.title.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>COORDINATES: {dataset.sourceMeta.latitude}, {dataset.sourceMeta.longitude}</span>
                        <span>SCALE: 1:250,000</span>
                        <div className="flex items-center gap-1">
                          <span className="w-6 h-1 bg-white inline-block" />
                          <span>10 km</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transparent Match Vectors Overlay spanning both viewports */}
                <canvas
                  ref={overlayVectorCanvasRef}
                  width={CANVAS_WIDTH * 2 + 20}
                  height={CANVAS_HEIGHT}
                  onClick={handleOverlayClick}
                  className="absolute top-6 left-0 w-full h-[460px] pointer-events-auto cursor-crosshair z-10"
                />
              </div>
            )}

            {/* Other Modes: Wipe Curtain, Checkerboard, Difference Heatmap & Flicker */}
            {viewMode !== 'side_by_side' && (
              <div 
                className="relative flex flex-col items-center cursor-default select-none"
                onMouseMove={viewMode === 'curtain_split' ? (e) => {
                  if (!isDraggingCurtain) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  setCurtainPos(Math.max(0.05, Math.min(0.95, x / rect.width)));
                } : undefined}
                onMouseUp={() => setIsDraggingCurtain(false)}
                onMouseLeave={() => setIsDraggingCurtain(false)}
              >
                <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
                  <canvas
                    ref={compositeCanvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="bg-black block"
                  />

                  {viewMode === 'curtain_split' && (
                    <div
                      onMouseDown={() => setIsDraggingCurtain(true)}
                      style={{ left: `${curtainPos * 100}%` }}
                      className="absolute top-0 bottom-0 -translate-x-1/2 w-8 cursor-ew-resize flex items-center justify-center group"
                    >
                      <div className="w-1 h-14 rounded-full bg-cyan-400 group-hover:bg-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Quantitative Telemetry Readout Strip */}
          <div className="bg-[#050a14] border border-slate-800/90 rounded-xl p-3 flex flex-wrap items-center justify-between text-xs font-mono gap-3">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">
                Sub-Pixel RMSE: <strong className="text-emerald-400">{metrics.subPixelRMSE.toFixed(3)} px</strong> ({metrics.rmseMeters.toFixed(3)} m)
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Inlier Ratio: <strong className="text-cyan-400">{metrics.inlierRatioPercent}%</strong> ({metrics.inlierCount} / {metrics.initialMatches})
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Spatial Uniformity: <strong className="text-purple-400">{metrics.spatialUniformityScore}%</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>Quadrant Bins: Q1={metrics.quadrantCounts[0]} • Q2={metrics.quadrantCounts[1]} • Q3={metrics.quadrantCounts[2]} • Q4={metrics.quadrantCounts[3]}</span>
              <span className="text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                Latency: {metrics.processingTimeMs} ms
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
