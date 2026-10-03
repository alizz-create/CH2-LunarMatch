import React, { useState, useRef } from 'react';
import { LunarDatasetPair } from '../types/lunar';
import { 
  Layers, 
  X, 
  ArrowRight, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  Sparkles,
  Sun,
  Camera
} from 'lucide-react';

interface SensorIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: LunarDatasetPair[];
  selectedDataset: LunarDatasetPair;
  onSelectDataset: (dataset: LunarDatasetPair) => void;
  onCustomUpload: (sourceUrl: string, refUrl: string, title: string) => void;
}

export const SensorIngestionModal: React.FC<SensorIngestionModalProps> = ({
  isOpen,
  onClose,
  datasets,
  selectedDataset,
  onSelectDataset,
  onCustomUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'mission' | 'custom'>('mission');

  // Custom upload states
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [refDataUrl, setRefDataUrl] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('Custom Lunar Observation');

  const sourceFileInputRef = useRef<HTMLInputElement | null>(null);
  const refFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleSourceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setSourceDataUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRefFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setRefDataUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteCustomUpload = () => {
    if (sourceDataUrl && refDataUrl) {
      onCustomUpload(sourceDataUrl, refDataUrl, customTitle);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-[#070d19] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#050913]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Sensor Data Ingestion &amp; Lunar Catalogs
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center border-b border-slate-800/80 px-6 pt-2 bg-[#050913]">
          <button
            onClick={() => setActiveTab('mission')}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === 'mission'
                ? 'text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mission Datasets (Chandrayaan-2 &amp; LRO)
            {activeTab === 'mission' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === 'custom'
                ? 'text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload Custom Lunar Pair
            {activeTab === 'custom' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            )}
          </button>
        </div>

        {/* Tab 1 Content: Mission Datasets */}
        {activeTab === 'mission' && (
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <p className="text-xs text-slate-400">
              Select an official Chandrayaan-2 mission acquisition paired with verified reference ground truth:
            </p>

            <div className="space-y-3">
              {datasets.map((ds) => {
                const isCurrentActive = ds.id === selectedDataset.id;
                const sunDeltaAz = Math.abs(ds.sourceMeta.sunAzimuthDeg - ds.refMeta.sunAzimuthDeg);
                const normalizedDeltaAz = sunDeltaAz > 180 ? 360 - sunDeltaAz : sunDeltaAz;
                const deltaEl = Math.abs(ds.sourceMeta.sunElevationDeg - ds.refMeta.sunElevationDeg);

                return (
                  <div
                    key={ds.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentActive
                        ? 'bg-[#091528] border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                        : 'bg-[#060c18] border-slate-800/90 hover:border-slate-700 hover:bg-[#0a1122]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-white tracking-wide">
                          {ds.title}
                        </h3>
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 space-y-0.5">
                        <div>
                          Source: <span className="text-cyan-400">{ds.sourceMeta.sensor} ({ds.sourceMeta.resolutionMetersPerPixel}m)</span>
                          <span className="mx-2 text-slate-600">•</span>
                          Ref: <span className="text-amber-400">{ds.refMeta.sensor} ({ds.refMeta.resolutionMetersPerPixel}m)</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Sun ΔAzimuth: <strong className="text-slate-300">{normalizedDeltaAz.toFixed(1)}°</strong>
                          <span className="mx-2 text-slate-600">•</span>
                          ΔElevation: <strong className="text-slate-300">{deltaEl.toFixed(1)}°</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onSelectDataset(ds);
                        onClose();
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 ${
                        isCurrentActive
                          ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <span>Load Site</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2 Content: Upload Custom Lunar Pair */}
        {activeTab === 'custom' && (
          <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
            <p className="text-xs text-slate-400">
              Ingest your own raw lunar orbital tiles (PNG, JPG, TIFF) to test the correspondence engine live:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dropzone 1: Source Image */}
              <div className="border border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-6 bg-[#060c18] flex flex-col items-center justify-center text-center gap-3 transition group">
                <input
                  type="file"
                  ref={sourceFileInputRef}
                  onChange={handleSourceFile}
                  accept="image/*"
                  className="hidden"
                />

                {sourceDataUrl ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <img
                      src={sourceDataUrl}
                      alt="Source preview"
                      className="w-28 h-28 object-cover rounded-lg border border-cyan-500/50 shadow"
                    />
                    <span className="text-[11px] text-cyan-300 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Source Loaded
                    </span>
                    <button
                      onClick={() => sourceFileInputRef.current?.click()}
                      className="text-[10px] text-slate-400 underline hover:text-white"
                    >
                      Replace File
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white mb-0.5">
                        Source Image (Moving)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        OHRC / TMC-2 or Raw Swath
                      </p>
                    </div>
                    <button
                      onClick={() => sourceFileInputRef.current?.click()}
                      className="mt-1 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow"
                    >
                      Browse File
                    </button>
                  </>
                )}
              </div>

              {/* Dropzone 2: Reference Image */}
              <div className="border border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl p-6 bg-[#060c18] flex flex-col items-center justify-center text-center gap-3 transition group">
                <input
                  type="file"
                  ref={refFileInputRef}
                  onChange={handleRefFile}
                  accept="image/*"
                  className="hidden"
                />

                {refDataUrl ? (
                  <div className="w-full flex flex-col items-center gap-2">
                    <img
                      src={refDataUrl}
                      alt="Reference preview"
                      className="w-28 h-28 object-cover rounded-lg border border-amber-500/50 shadow"
                    />
                    <span className="text-[11px] text-amber-300 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Reference Loaded
                    </span>
                    <button
                      onClick={() => refFileInputRef.current?.click()}
                      className="text-[10px] text-slate-400 underline hover:text-white"
                    >
                      Replace File
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white mb-0.5">
                        Reference Image (Fixed)
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        LRO NAC or Ground Mosaic
                      </p>
                    </div>
                    <button
                      onClick={() => refFileInputRef.current?.click()}
                      className="mt-1 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow"
                    >
                      Browse File
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Ingest Action Button */}
            {sourceDataUrl && refDataUrl && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleCompleteCustomUpload}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-500/30 flex items-center gap-2 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Ingest &amp; Run Correspondence Engine</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-[#050913] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
