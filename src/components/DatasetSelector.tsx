import React, { useRef } from 'react';
import { LunarDatasetPair } from '../types/lunar';
import { 
  Compass, 
  Sun, 
  Layers, 
  MapPin, 
  Camera, 
  AlertTriangle,
  Info,
  Check,
  UploadCloud,
  Sparkles
} from 'lucide-react';

interface DatasetSelectorProps {
  datasets: LunarDatasetPair[];
  selectedDataset: LunarDatasetPair;
  onSelectDataset: (dataset: LunarDatasetPair) => void;
  onUploadCustomPair?: (sourceUrl: string, refUrl: string, title: string) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  datasets,
  selectedDataset,
  onSelectDataset,
  onUploadCustomPair,
}) => {
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const refInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSourceRef = useRef<string | null>(null);

  const handleSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const srcData = event.target?.result as string;
        pendingSourceRef.current = srcData;
        // Prompt for reference image
        refInputRef.current?.click();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingSourceRef.current && onUploadCustomPair) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const refData = event.target?.result as string;
        onUploadCustomPair(pendingSourceRef.current!, refData, file.name.replace(/\.[^/.]+$/, ""));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Camera className="w-3 h-3" />
              AUTHENTIC LUNAR ORBITAL PHOTOGRAPHS ACTIVE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              CH-2 OHRC • TMC-2 • IIRS & LRO NAC
            </span>
          </div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            ISRO Chandrayaan-2 & Lunar Reference Observation Pairs
          </h2>
          <p className="text-xs text-slate-400">
            Real orbital photographs capturing authentic lunar terrain, micro-craters, boulders, and dramatic sun angle shadows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden inputs for custom upload */}
          <input
            type="file"
            ref={sourceInputRef}
            onChange={handleSourceUpload}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={refInputRef}
            onChange={handleRefUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => sourceInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition border border-slate-700 flex items-center gap-1.5 shadow-sm"
            title="Upload custom Source & Reference moon photos"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Moon Images</span>
          </button>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 hidden lg:inline">
            Current: {selectedDataset.sourceMeta.sensor} ➔ {selectedDataset.refMeta.sensor}
          </span>
        </div>
      </div>

      {/* Dataset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {datasets.map((ds) => {
          const isSelected = ds.id === selectedDataset.id;
          const sunDelta = Math.abs(ds.sourceMeta.sunAzimuthDeg - ds.refMeta.sunAzimuthDeg);
          const scaleRatio = Math.max(
            ds.sourceMeta.resolutionMetersPerPixel / ds.refMeta.resolutionMetersPerPixel,
            ds.refMeta.resolutionMetersPerPixel / ds.sourceMeta.resolutionMetersPerPixel
          ).toFixed(1);

          return (
            <button
              key={ds.id}
              onClick={() => onSelectDataset(ds)}
              className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between group ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900/90 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shadow">
                  <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    ds.sourceMeta.sensor === 'OHRC' 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                      : ds.sourceMeta.sensor === 'TMC-2'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {ds.sourceMeta.sensor}
                  </span>
                  <span className="text-[10px] text-slate-500">vs</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {ds.refMeta.sensor}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 line-clamp-1">
                  {ds.title}
                </h3>

                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                  {ds.regionName}
                </p>
              </div>

              {/* Challenge badges */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1 text-amber-400">
                  <Sun className="w-2.5 h-2.5" />
                  ΔAz {sunDelta.toFixed(0)}°
                </span>
                <span className="text-cyan-400">
                  {scaleRatio}x Scale
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Dataset Deep Orbital Telemetry Strip */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs bg-slate-950/40 p-2.5 rounded-xl">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-mono">Source Payload</span>
          <span className="font-semibold text-slate-200">
            {selectedDataset.sourceMeta.sensor} ({selectedDataset.sourceMeta.resolutionMetersPerPixel} m/px)
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Elev {selectedDataset.sourceMeta.sunElevationDeg}° | Az {selectedDataset.sourceMeta.sunAzimuthDeg}°
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-mono">Reference Target</span>
          <span className="font-semibold text-slate-200">
            {selectedDataset.refMeta.sensor} ({selectedDataset.refMeta.resolutionMetersPerPixel} m/px)
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Elev {selectedDataset.refMeta.sunElevationDeg}° | Az {selectedDataset.refMeta.sunAzimuthDeg}°
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-mono">Spectral Band</span>
          <span className="font-semibold text-slate-200 truncate block">
            {selectedDataset.sourceMeta.spectralBand}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Phase {selectedDataset.sourceMeta.phaseAngleDeg}°
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-mono">Target Coordinates</span>
          <span className="font-semibold text-slate-200">
            {selectedDataset.sourceMeta.latitude}, {selectedDataset.sourceMeta.longitude}
          </span>
          <span className="text-[10px] text-cyan-400 block font-mono truncate">
            {selectedDataset.sourceMeta.targetFeature}
          </span>
        </div>

        <div className="col-span-2">
          <span className="text-[10px] text-amber-400 block uppercase font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Hackathon Challenge Core
          </span>
          <span className="text-[11px] text-slate-300 font-medium">
            {selectedDataset.challengeHighlight}
          </span>
        </div>
      </div>
    </div>
  );
};
