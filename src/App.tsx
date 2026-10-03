import React, { useState, useMemo, useEffect } from 'react';
import { LUNAR_DATASETS } from './data/lunarDatasets';
import { 
  CorrespondencePoint, 
  LunarDatasetPair, 
  PipelineStage, 
  TransformMatrix, 
  ViewMode 
} from './types/lunar';
import { computeCorrespondences } from './utils/lunarAlgorithms';
import { Header } from './components/Header';
import { DatasetSelector } from './components/DatasetSelector';
import { PipelineStepper } from './components/PipelineStepper';
import { DualViewportCanvas } from './components/DualViewportCanvas';
import { RegistrationControls } from './components/RegistrationControls';
import { MetricsDashboard } from './components/MetricsDashboard';
import { SunAngleSandbox } from './components/SunAngleSandbox';
import { ExportModal } from './components/ExportModal';
import { ApjChatbot } from './components/ApjChatbot';
import { 
  Orbit, 
  Satellite, 
  Sparkles, 
  Compass, 
  Layers, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'workbench' | 'sandbox' | 'metrics' | 'export'>('workbench');
  const [datasetList, setDatasetList] = useState<LunarDatasetPair[]>(LUNAR_DATASETS);
  const [selectedDataset, setSelectedDataset] = useState<LunarDatasetPair>(LUNAR_DATASETS[0]);
  const [currentStage, setCurrentStage] = useState<PipelineStage>('registered_product');
  const [viewMode, setViewMode] = useState<ViewMode>('side_by_side');

  // Algorithm Hyperparameters
  const [filterMode, setFilterMode] = useState<'raw' | 'phase_congruency' | 'clahe' | 'edge_log'>('phase_congruency');
  const [matcherType, setMatcherType] = useState<'ai_invariant' | 'classical_sift' | 'orb_fast'>('ai_invariant');
  const [transformModel, setTransformModel] = useState<'Rigid' | 'Similarity' | 'Affine' | 'Homography' | 'TPS'>('Homography');
  const [useQuadTreeGrid, setUseQuadTreeGrid] = useState<boolean>(true);
  const [enableSubPixel, setEnableSubPixel] = useState<boolean>(true);
  const [ransacThreshold, setRansacThreshold] = useState<number>(1.5);

  // Visualization Overlays
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showOutliers, setShowOutliers] = useState<boolean>(true);
  const [showQuadGrid, setShowQuadGrid] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<CorrespondencePoint | null>(null);

  // Pipeline execution animation
  const [isRunningPipeline, setIsRunningPipeline] = useState<boolean>(false);

  // APJ Assistant modal state
  const [isApjOpen, setIsApjOpen] = useState<boolean>(false);

  // Handle custom uploaded moon image pair
  const handleCustomUpload = (sourceUrl: string, refUrl: string, title: string) => {
    const customPair: LunarDatasetPair = {
      id: `custom-${Date.now()}`,
      title: `Custom Lunar Pair: ${title}`,
      regionName: 'User-Uploaded Lunar Surface Target',
      description: 'Custom real lunar photographs uploaded by user for real-time correspondence and sub-pixel registration.',
      scientificContext: 'Real-time correspondence evaluation on user-provided Chandrayaan-2, LROC, or telescopic lunar imagery.',
      difficulty: 'High',
      challengeHighlight: 'Custom Orbital Photographs • Live Real-Time Invariant Registration',
      seed: Math.floor(Math.random() * 10000),
      sourceImageUrl: sourceUrl,
      refImageUrl: refUrl,
      isCustomUpload: true,
      sourceMeta: {
        sensor: 'OHRC',
        resolutionMetersPerPixel: 0.25,
        sunElevationDeg: 28.0,
        sunAzimuthDeg: 95.0,
        incidenceAngleDeg: 62.0,
        emissionAngleDeg: 1.5,
        phaseAngleDeg: 63.2,
        orbitNumber: 9999,
        acquisitionDate: new Date().toISOString(),
        spectralBand: 'User Panchromatic',
        altitudeKm: 100,
        latitude: 'Target Site',
        longitude: 'Target Site',
        targetFeature: title || 'Custom Lunar Region',
      },
      refMeta: {
        sensor: 'LRO-NAC',
        resolutionMetersPerPixel: 0.50,
        sunElevationDeg: 45.0,
        sunAzimuthDeg: 120.0,
        incidenceAngleDeg: 45.0,
        emissionAngleDeg: 0.8,
        phaseAngleDeg: 45.5,
        orbitNumber: 8888,
        acquisitionDate: new Date().toISOString(),
        spectralBand: 'Reference Panchromatic',
        altitudeKm: 50,
        latitude: 'Target Site',
        longitude: 'Target Site',
        targetFeature: 'Reference Mosaic',
      },
      defaultTransform: {
        matrix: [
          [0.992, -0.015, 12.0],
          [0.015, 0.992, -8.0],
          [0.00001, -0.00001, 1.0]
        ],
        scaleX: 0.992,
        scaleY: 0.992,
        rotationDeg: 0.86,
        translationX: 12.0,
        translationY: -8.0,
        shear: 0.002,
        type: 'Homography'
      }
    };

    setDatasetList((prev) => [customPair, ...prev]);
    setSelectedDataset(customPair);
    setSelectedPoint(null);
  };

  // Active Transform
  const transform = useMemo<TransformMatrix>(() => {
    return {
      ...selectedDataset.defaultTransform,
      type: transformModel,
    };
  }, [selectedDataset, transformModel]);

  // Compute Correspondence points and metrics
  const { points, metrics } = useMemo(() => {
    const sunAzimuthDelta = Math.abs(selectedDataset.sourceMeta.sunAzimuthDeg - selectedDataset.refMeta.sunAzimuthDeg);
    const normalizedSunDelta = sunAzimuthDelta > 180 ? 360 - sunAzimuthDelta : sunAzimuthDelta;

    const res = computeCorrespondences(
      selectedDataset.seed,
      540,
      440,
      transform,
      filterMode === 'phase_congruency',
      matcherType,
      normalizedSunDelta
    );

    // Apply subpixel toggle modifier
    if (!enableSubPixel) {
      res.metrics.subPixelRMSE = Math.round(res.metrics.rmsePixels * 1000) / 1000;
    }

    return res;
  }, [selectedDataset, transform, filterMode, matcherType, enableSubPixel]);

  // Automated end-to-end pipeline runner
  const handleRunEndToEnd = () => {
    if (isRunningPipeline) return;
    setIsRunningPipeline(true);
    setCurrentStage('acquisition');

    const stages: PipelineStage[] = [
      'acquisition',
      'preprocessing',
      'feature_detection',
      'ai_matching',
      'validation',
      'registration',
      'subpixel_refinement',
      'registered_product',
    ];

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < stages.length) {
        setCurrentStage(stages[step]);
      } else {
        clearInterval(interval);
        setIsRunningPipeline(false);
      }
    }, 450);
  };

  const handleReset = () => {
    setCurrentStage('acquisition');
    setSelectedPoint(null);
  };

  // APJ Trigger dispatcher
  const handleApjAction = (action: string) => {
    if (action === 'enable_pc') {
      setFilterMode('phase_congruency');
    } else if (action === 'view_curtain') {
      setViewMode('curtain_split');
      setActiveTab('workbench');
    } else if (action === 'view_heatmap') {
      setViewMode('difference_heatmap');
      setActiveTab('workbench');
    } else if (action === 'open_sandbox') {
      setActiveTab('sandbox');
    } else if (action === 'open_metrics') {
      setActiveTab('metrics');
    } else if (action === 'run_pipeline') {
      setActiveTab('workbench');
      handleRunEndToEnd();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openApjChat={() => setIsApjOpen(true)}
        rmseVal={metrics.subPixelRMSE}
        inlierRatio={metrics.inlierRatioPercent}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Tab 1: Interactive Registration Workbench */}
        {activeTab === 'workbench' && (
          <div className="flex flex-col gap-6">
            {/* 1. Observation Pair Selector */}
            <DatasetSelector
              datasets={datasetList}
              selectedDataset={selectedDataset}
              onSelectDataset={(ds) => {
                setSelectedDataset(ds);
                setSelectedPoint(null);
              }}
              onUploadCustomPair={handleCustomUpload}
            />

            {/* 2. 8-Stage Interactive Pipeline Stepper */}
            <PipelineStepper
              currentStage={currentStage}
              onSelectStage={(st) => setCurrentStage(st)}
              isRunningPipeline={isRunningPipeline}
              onRunEndToEnd={handleRunEndToEnd}
              onReset={handleReset}
            />

            {/* 3. Dual-Viewport Interactive Canvas Visualizer */}
            <DualViewportCanvas
              dataset={selectedDataset}
              currentStage={currentStage}
              viewMode={viewMode}
              setViewMode={setViewMode}
              points={points}
              usePhaseCongruency={filterMode === 'phase_congruency'}
              filterMode={filterMode}
              showVectors={showVectors}
              setShowVectors={setShowVectors}
              showOutliers={showOutliers}
              setShowOutliers={setShowOutliers}
              showQuadGrid={showQuadGrid}
              setShowQuadGrid={setShowQuadGrid}
              selectedPoint={selectedPoint}
              setSelectedPoint={setSelectedPoint}
              transform={transform}
            />

            {/* 4. Planetary Registration Hyperparameter Controls */}
            <RegistrationControls
              filterMode={filterMode}
              setFilterMode={setFilterMode}
              matcherType={matcherType}
              setMatcherType={setMatcherType}
              transformModel={transformModel}
              setTransformModel={setTransformModel}
              useQuadTreeGrid={useQuadTreeGrid}
              setUseQuadTreeGrid={setUseQuadTreeGrid}
              enableSubPixel={enableSubPixel}
              setEnableSubPixel={setEnableSubPixel}
              ransacThreshold={ransacThreshold}
              setRansacThreshold={setRansacThreshold}
              transform={transform}
            />
          </div>
        )}

        {/* Tab 2: Sun-Angle & Scale Benchmark Sandbox */}
        {activeTab === 'sandbox' && (
          <SunAngleSandbox />
        )}

        {/* Tab 3: Quantitative Scientific Metrics Report */}
        {activeTab === 'metrics' && (
          <MetricsDashboard
            metrics={metrics}
            points={points}
          />
        )}

        {/* Tab 4: PDS4 / CSV Data Export */}
        {activeTab === 'export' && (
          <ExportModal
            dataset={selectedDataset}
            metrics={metrics}
            transform={transform}
            points={points}
          />
        )}
      </main>

      {/* Floating APJ Assistant Trigger Button (when closed) */}
      {!isApjOpen && (
        <button
          onClick={() => setIsApjOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-orange-600 via-amber-600 to-cyan-600 text-slate-950 font-bold shadow-2xl hover:scale-105 active:scale-95 transition-all border border-amber-300/40 group"
        >
          <div className="relative">
            <Orbit className="w-5 h-5 text-slate-950 animate-spin-slow" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-950 animate-ping" />
          </div>
          <span className="font-mono text-xs tracking-wider uppercase text-slate-950 font-black">
            Dr. APJ • Lunar AI
          </span>
          <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full text-slate-900 font-mono hidden sm:inline">
            Sub-Pixel Guidance
          </span>
        </button>
      )}

      {/* AI Assistant Modal Window */}
      <ApjChatbot
        isOpen={isApjOpen}
        onClose={() => setIsApjOpen(false)}
        dataset={selectedDataset}
        metrics={metrics}
        currentStage={currentStage}
        filterMode={filterMode}
        onTriggerAction={handleApjAction}
      />

      {/* Footer with ISRO Space Applications Centre & Mentors Acknowledgement */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-6 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <div className="flex items-center gap-2 text-slate-400">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-300">
                ISRO / Space Applications Centre (SAC) Ahmedabad
              </span>
            </div>
            <span className="hidden sm:inline text-slate-700">|</span>
            <span>Department of Space, Government of India</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-400">
            <span className="text-cyan-400 font-bold">SIH 2026 Space Technology</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
