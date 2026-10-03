import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  CorrespondencePoint, 
  LunarDatasetPair, 
  PipelineStage, 
  TransformMatrix, 
  ViewMode 
} from '../types/lunar';
import { renderLunarSurface, preloadLunarImage } from '../utils/lunarAlgorithms';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Layers, 
  Sliders, 
  Eye, 
  EyeOff, 
  Grid, 
  Crosshair, 
  RefreshCw,
  Sun,
  Activity,
  Camera,
  Compass
} from 'lucide-react';

interface DualViewportCanvasProps {
  dataset: LunarDatasetPair;
  currentStage: PipelineStage;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  points: CorrespondencePoint[];
  usePhaseCongruency: boolean;
  filterMode: 'raw' | 'phase_congruency' | 'clahe' | 'edge_log';
  showVectors: boolean;
  setShowVectors: (val: boolean) => void;
  showOutliers: boolean;
  setShowOutliers: (val: boolean) => void;
  showQuadGrid: boolean;
  setShowQuadGrid: (val: boolean) => void;
  selectedPoint: CorrespondencePoint | null;
  setSelectedPoint: (pt: CorrespondencePoint | null) => void;
  transform: TransformMatrix;
}

const CANVAS_WIDTH = 540;
const CANVAS_HEIGHT = 440;

export const DualViewportCanvas: React.FC<DualViewportCanvasProps> = ({
  dataset,
  currentStage,
  viewMode,
  setViewMode,
  points,
  usePhaseCongruency,
  filterMode,
  showVectors,
  setShowVectors,
  showOutliers,
  setShowOutliers,
  showQuadGrid,
  setShowQuadGrid,
  selectedPoint,
  setSelectedPoint,
  transform,
}) => {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const refCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const registeredCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayVectorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const visibleSourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visibleRefCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload real moon photos when mounting
  useEffect(() => {
    if (dataset.sourceImageUrl) preloadLunarImage(dataset.sourceImageUrl);
    if (dataset.refImageUrl) preloadLunarImage(dataset.refImageUrl);
  }, [dataset]);

  // Split-curtain divider position (0.0 to 1.0)
  const [curtainPos, setCurtainPos] = useState<number>(0.5);
  const [isDraggingCurtain, setIsDraggingCurtain] = useState<boolean>(false);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [renderCounter, setRenderCounter] = useState<number>(0);

  // Flicker comparator state
  const [flickerState, setFlickerState] = useState<'source' | 'ref'>('source');
  const [flickerSpeedMs, setFlickerSpeedMs] = useState<number>(400);

  // Re-render base surfaces when dataset, stage, or filter changes
  useEffect(() => {
    // 1. Direct render to visible DOM canvases (ensures instant drawing of real lunar images)
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

    // 2. Offscreen buffers for composite modes (wipe curtain, checkerboard, heatmap, blink)
    if (sourceCanvasRef.current) {
      renderLunarSurface(
        sourceCanvasRef.current,
        dataset.seed,
        dataset.sourceMeta,
        filterMode,
        undefined,
        dataset.sourceImageUrl,
        () => setRenderCounter((c) => c + 1)
      );
    }

    if (refCanvasRef.current) {
      renderLunarSurface(
        refCanvasRef.current,
        dataset.seed,
        dataset.refMeta,
        filterMode,
        undefined,
        dataset.refImageUrl,
        () => setRenderCounter((c) => c + 1)
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
        dataset.sourceImageUrl,
        () => setRenderCounter((c) => c + 1)
      );
    }
  }, [dataset, filterMode, currentStage, transform]);

  // Handle composite canvas rendering for Curtain, Checkerboard, and Difference Heatmap
  useEffect(() => {
    const compCanvas = compositeCanvasRef.current;
    const refCanvas = refCanvasRef.current;
    const regCanvas = registeredCanvasRef.current;
    if (!compCanvas || !refCanvas || !regCanvas) return;

    const ctx = compCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (viewMode === 'curtain_split') {
      // Split Curtain: Draw Ref on left, Registered Source on right
      const splitX = Math.floor(CANVAS_WIDTH * curtainPos);
      
      // Draw Reference base
      ctx.drawImage(refCanvas, 0, 0);

      // Clip and draw registered source on right side
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, CANVAS_WIDTH - splitX, CANVAS_HEIGHT);
      ctx.clip();
      ctx.drawImage(regCanvas, 0, 0);
      ctx.restore();

      // Draw vertical divider bar
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, CANVAS_HEIGHT);
      ctx.stroke();

      // Divider handle
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(splitX, CANVAS_HEIGHT / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(splitX, CANVAS_HEIGHT / 2, 4, 0, Math.PI * 2);
      ctx.fill();

    } else if (viewMode === 'checkerboard') {
      // Checkerboard Interleaving (8x8 tiles)
      const tileSize = 60;
      for (let y = 0; y < CANVAS_HEIGHT; y += tileSize) {
        for (let x = 0; x < CANVAS_WIDTH; x += tileSize) {
          const isEven = (Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0;
          const srcToDraw = isEven ? refCanvas : regCanvas;
          ctx.drawImage(srcToDraw, x, y, tileSize, tileSize, x, y, tileSize, tileSize);
        }
      }

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= CANVAS_WIDTH; x += tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y <= CANVAS_HEIGHT; y += tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

    } else if (viewMode === 'difference_heatmap') {
      // Compute pixel-wise absolute difference |WarpedSource - Reference|
      const refCtx = refCanvas.getContext('2d');
      const regCtx = regCanvas.getContext('2d');
      if (refCtx && regCtx) {
        const refImg = refCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const regImg = regCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        const diffImg = ctx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);

        for (let i = 0; i < refImg.data.length; i += 4) {
          const diff = Math.abs(regImg.data[i] - refImg.data[i]);
          // Colormap: 0 = Dark Navy, 40 = Cyan, 120 = Orange, 255 = Bright Red
          if (diff < 15) {
            diffImg.data[i] = 10;
            diffImg.data[i + 1] = 20;
            diffImg.data[i + 2] = 50 + diff * 3;
          } else if (diff < 60) {
            diffImg.data[i] = 10;
            diffImg.data[i + 1] = Math.min(255, 100 + diff * 2);
            diffImg.data[i + 2] = 220;
          } else {
            diffImg.data[i] = Math.min(255, 160 + diff);
            diffImg.data[i + 1] = Math.max(0, 200 - diff);
            diffImg.data[i + 2] = 20;
          }
          diffImg.data[i + 3] = 255;
        }
        ctx.putImageData(diffImg, 0, 0);
      }
    } else if (viewMode === 'flicker_comparator') {
      // Flicker between registered source and reference
      const toDraw = flickerState === 'source' ? regCanvas : refCanvas;
      ctx.drawImage(toDraw, 0, 0);
    }
  }, [viewMode, curtainPos, flickerState, dataset, filterMode, currentStage, transform]);

  // Flicker comparator timer
  useEffect(() => {
    if (viewMode !== 'flicker_comparator') return;
    const timer = setInterval(() => {
      setFlickerState((prev) => (prev === 'source' ? 'ref' : 'source'));
    }, flickerSpeedMs);
    return () => clearInterval(timer);
  }, [viewMode, flickerSpeedMs]);

  // Draw Tie-Point Vectors and Keypoints on Overlay Canvas
  useEffect(() => {
    const canvas = overlayVectorCanvasRef.current;
    if (!canvas || viewMode !== 'side_by_side') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Quad-Tree Grid if enabled
    if (showQuadGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Source side quadrants
      ctx.strokeRect(0, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(0, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

      // Reference side quadrants
      const refOffset = CANVAS_WIDTH + 24;
      ctx.strokeRect(refOffset, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(refOffset + CANVAS_WIDTH / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(refOffset, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.strokeRect(refOffset + CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

      ctx.setLineDash([]);
    }

    if (!showVectors) return;

    const refOffset = CANVAS_WIDTH + 24;

    points.forEach((pt) => {
      if (!showOutliers && !pt.inlier) return;

      const isSelected = selectedPoint?.id === pt.id;
      const x1 = pt.srcX;
      const y1 = pt.srcY;
      const x2 = refOffset + pt.refX;
      const y2 = pt.refY;

      // Draw match line connecting source and reference
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      if (pt.inlier) {
        ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(52, 211, 153, 0.55)'; // Emerald for inlier
        ctx.lineWidth = isSelected ? 2.5 : 1.2;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = isSelected ? '#f87171' : 'rgba(239, 68, 68, 0.45)'; // Red for outlier
        ctx.lineWidth = isSelected ? 2.0 : 1.0;
        ctx.setLineDash([3, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Source Point Marker
      ctx.fillStyle = pt.inlier ? '#10b981' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x1, y1, isSelected ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Reference Point Marker with Sub-Pixel Refinement ring
      ctx.fillStyle = pt.inlier ? '#06b6d4' : '#ef4444';
      ctx.beginPath();
      ctx.arc(x2, y2, isSelected ? 5.5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sub-pixel crosshair for inliers
      if (pt.inlier && (isSelected || currentStage === 'subpixel_refinement')) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x2 - 6, y2);
        ctx.lineTo(x2 + 6, y2);
        ctx.moveTo(x2, y2 - 6);
        ctx.lineTo(x2, y2 + 6);
        ctx.stroke();
      }
    });
  }, [points, showVectors, showOutliers, showQuadGrid, selectedPoint, viewMode, currentStage]);

  // Curtain Dragging Handlers
  const handleCurtainMouseDown = () => setIsDraggingCurtain(true);
  const handleCurtainMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCurtain) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPos = Math.max(0.05, Math.min(0.95, x / rect.width));
    setCurtainPos(newPos);
  };
  const handleCurtainMouseUp = () => setIsDraggingCurtain(false);

  // Click on vector overlay to select point
  const handleOverlayClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const refOffset = CANVAS_WIDTH + 24;

    // Find nearest point within 10px
    let closest: CorrespondencePoint | null = null;
    let minDist = 14;

    for (const pt of points) {
      const distSrc = Math.hypot(clickX - pt.srcX, clickY - pt.srcY);
      const distRef = Math.hypot(clickX - (refOffset + pt.refX), clickY - pt.refY);
      const d = Math.min(distSrc, distRef);
      if (d < minDist) {
        minDist = d;
        closest = pt;
      }
    }

    setSelectedPoint(closest);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      {/* Top Viewport Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        {/* View Mode Selectors */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setViewMode('side_by_side')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'side_by_side'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Side-by-Side Matches
          </button>

          <button
            onClick={() => setViewMode('curtain_split')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'curtain_split'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Wipe Curtain Slider
          </button>

          <button
            onClick={() => setViewMode('checkerboard')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'checkerboard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Checkerboard Grid
          </button>

          <button
            onClick={() => setViewMode('difference_heatmap')}
            className={`px-3 py-1 rounded-md transition ${
              viewMode === 'difference_heatmap'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Residual Heatmap
          </button>

          <button
            onClick={() => setViewMode('flicker_comparator')}
            className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
              viewMode === 'flicker_comparator'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            Blink Comparator
          </button>
        </div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-2 text-xs">
          {viewMode === 'side_by_side' && (
            <>
              <button
                onClick={() => setShowVectors(!showVectors)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition flex items-center gap-1 ${
                  showVectors
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                {showVectors ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Vectors ({points.filter((p) => p.inlier).length})
              </button>

              <button
                onClick={() => setShowOutliers(!showOutliers)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition flex items-center gap-1 ${
                  showOutliers
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                Outliers ({points.filter((p) => !p.inlier).length})
              </button>

              <button
                onClick={() => setShowQuadGrid(!showQuadGrid)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition flex items-center gap-1 ${
                  showQuadGrid
                    ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
              >
                <Grid className="w-3 h-3" />
                Uniform Grid
              </button>
            </>
          )}

          {viewMode === 'flicker_comparator' && (
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span>Speed:</span>
              <button
                onClick={() => setFlickerSpeedMs(600)}
                className={`px-2 py-0.5 rounded ${flickerSpeedMs === 600 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800'}`}
              >
                1.5 Hz
              </button>
              <button
                onClick={() => setFlickerSpeedMs(350)}
                className={`px-2 py-0.5 rounded ${flickerSpeedMs === 350 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800'}`}
              >
                3.0 Hz
              </button>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                Active: {flickerState === 'source' ? `Warped ${dataset.sourceMeta.sensor}` : dataset.refMeta.sensor}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport Area */}
      <div className="relative overflow-x-auto bg-slate-950 rounded-xl border border-slate-800/80 p-3 min-h-[460px] flex items-center justify-center">
        {/* Hidden rendering buffers */}
        <canvas ref={sourceCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
        <canvas ref={refCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />
        <canvas ref={registeredCanvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="hidden" />

        {/* View Mode 1: Side by Side Dual Viewport */}
        {viewMode === 'side_by_side' && (
          <div className="relative flex items-center gap-6">
            {/* Source Frame */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-1 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  REAL MOON PHOTOGRAPH: {dataset.sourceMeta.sensor} (GSD: {dataset.sourceMeta.resolutionMetersPerPixel} m/px)
                </span>
                <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Sun Az {dataset.sourceMeta.sunAzimuthDeg}° | Elev {dataset.sourceMeta.sunElevationDeg}°
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl group bg-black">
                <canvas
                  ref={visibleSourceCanvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="bg-black block"
                />

                {/* Top Badge: Real Space Agency Mission Asset */}
                <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-md">
                  <Camera className="w-3 h-3 text-cyan-400" />
                  <span className="font-bold">CHANDRAYAAN-2 ORBITAL IMAGERY</span>
                </div>

                {/* Bottom Overlay: Ground Coordinates & Elevation */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-300 border border-slate-800/90 flex items-center justify-between shadow-md">
                  <span className="truncate max-w-[200px]">Target: {dataset.sourceMeta.targetFeature}</span>
                  <span className="text-cyan-400 font-bold">Coords: {dataset.sourceMeta.latitude}, {dataset.sourceMeta.longitude}</span>
                </div>
              </div>
            </div>

            {/* Reference Frame */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-1 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                  REFERENCE PHOTOGRAPH: {dataset.refMeta.sensor} (GSD: {dataset.refMeta.resolutionMetersPerPixel} m/px)
                </span>
                <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Sun Az {dataset.refMeta.sunAzimuthDeg}° | Elev {dataset.refMeta.sunElevationDeg}°
                </span>
              </div>
              <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl group bg-black">
                <canvas
                  ref={visibleRefCanvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="bg-black block"
                />

                {/* Top Badge: Real Reference Mosaic Asset */}
                <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-md">
                  <Camera className="w-3 h-3 text-amber-400" />
                  <span className="font-bold">NASA LRO NAC PHOTOMETRIC REFERENCE</span>
                </div>

                {/* Bottom Overlay: Scale Bar and Angle Metrics */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-mono text-slate-300 border border-slate-800/90 flex items-center justify-between shadow-md">
                  <span className="truncate max-w-[200px]">Target: {dataset.refMeta.targetFeature}</span>
                  <span className="text-amber-400 font-bold">Phase: {dataset.refMeta.phaseAngleDeg}° | Inc: {dataset.refMeta.incidenceAngleDeg}°</span>
                </div>
              </div>
            </div>

            {/* Transparent Vector Overlay spanning across both canvases */}
            <canvas
              ref={overlayVectorCanvasRef}
              width={CANVAS_WIDTH * 2 + 24}
              height={CANVAS_HEIGHT}
              onClick={handleOverlayClick}
              className="absolute top-6 left-0 w-full h-[440px] pointer-events-auto cursor-crosshair z-10"
            />
          </div>
        )}

        {/* View Mode 2: Wipe Curtain, Checkerboard, Difference Heatmap & Flicker */}
        {viewMode !== 'side_by_side' && (
          <div 
            className="relative flex flex-col items-center cursor-default select-none"
            onMouseMove={viewMode === 'curtain_split' ? handleCurtainMouseMove : undefined}
            onMouseUp={viewMode === 'curtain_split' ? handleCurtainMouseUp : undefined}
            onMouseLeave={viewMode === 'curtain_split' ? handleCurtainMouseUp : undefined}
          >
            <div className="flex items-center justify-between w-full max-w-[620px] mb-2 text-xs font-mono text-slate-300">
              <span className="font-bold text-cyan-400">
                {viewMode === 'curtain_split' && `◄ Reference (${dataset.refMeta.sensor}) | Registered Source (${dataset.sourceMeta.sensor}) ►`}
                {viewMode === 'checkerboard' && `Interleaved 60px Tiles: ${dataset.refMeta.sensor} ⇄ Warped ${dataset.sourceMeta.sensor}`}
                {viewMode === 'difference_heatmap' && `Absolute Residual Error Heatmap: |Registered ${dataset.sourceMeta.sensor} - ${dataset.refMeta.sensor}|`}
                {viewMode === 'flicker_comparator' && `Astronomical Blink Comparator (Cycles at ${(1000 / flickerSpeedMs).toFixed(1)} Hz)`}
              </span>
              <span className="text-[11px] text-slate-500">
                {viewMode === 'curtain_split' && 'Drag slider left/right across crater rims'}
                {viewMode === 'difference_heatmap' && 'Dark Navy = Zero Drift (< 0.15 px)'}
              </span>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-700 shadow-2xl">
              <canvas
                ref={compositeCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="bg-black block"
              />

              {/* Curtain Drag Handle Trigger Area */}
              {viewMode === 'curtain_split' && (
                <div
                  onMouseDown={handleCurtainMouseDown}
                  style={{ left: `${curtainPos * 100}%` }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 w-8 cursor-ew-resize flex items-center justify-center group"
                >
                  <div className="w-1.5 h-12 rounded-full bg-cyan-400/80 group-hover:bg-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                </div>
              )}
            </div>

            {/* Colormap Legend for Difference Heatmap */}
            {viewMode === 'difference_heatmap' && (
              <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-slate-400">
                <span>Residual Scale:</span>
                <div className="w-48 h-3 rounded-full bg-gradient-to-r from-blue-950 via-cyan-400 to-rose-500 border border-slate-700" />
                <span>0.0 px (Optimal) ➔ 1.5+ px (Drift)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Tie-Point Sub-Pixel Loupe & Inspector Panel */}
      {selectedPoint && (
        <div className="bg-slate-950/80 border border-cyan-500/40 rounded-xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Crosshair className="w-5 h-5 text-cyan-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Tie-Point #{selectedPoint.id}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                  selectedPoint.inlier 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {selectedPoint.inlier ? 'RANSAC INLIER' : 'REJECTED OUTLIER'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Quadrant {selectedPoint.quadrant}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 capitalize">
                  {selectedPoint.featureType.replace('_', ' ')}
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <span>Source: [{selectedPoint.srcX}, {selectedPoint.srcY}]</span>
                <span>Ref: [{selectedPoint.refX}, {selectedPoint.refY}]</span>
                <span className="text-cyan-300">
                  Sub-Pixel Offset: (Δx: {selectedPoint.subPixelDx > 0 ? `+${selectedPoint.subPixelDx}` : selectedPoint.subPixelDx} px, Δy: {selectedPoint.subPixelDy > 0 ? `+${selectedPoint.subPixelDy}` : selectedPoint.subPixelDy} px)
                </span>
                <span className="text-emerald-400 font-bold">
                  Residual: {selectedPoint.residualPx.toFixed(3)} px ({selectedPoint.residualMeters.toFixed(3)} m)
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedPoint(null)}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg border border-slate-800 hover:bg-slate-900 transition self-end md:self-auto"
          >
            Close Inspector
          </button>
        </div>
      )}
    </div>
  );
};
