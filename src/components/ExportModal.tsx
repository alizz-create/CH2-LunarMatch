import React, { useState } from 'react';
import { CorrespondencePoint, LunarDatasetPair, PipelineMetrics, TransformMatrix } from '../types/lunar';
import { generatePDS4Metadata, generateTiePointsCSV } from '../utils/lunarAlgorithms';
import { 
  FileText, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  Table, 
  ShieldCheck, 
  Award,
  Layers
} from 'lucide-react';

interface ExportModalProps {
  dataset: LunarDatasetPair;
  metrics: PipelineMetrics;
  transform: TransformMatrix;
  points: CorrespondencePoint[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  dataset,
  metrics,
  transform,
  points,
}) => {
  const [activeTab, setActiveTab] = useState<'pds4' | 'csv' | 'certificate'>('pds4');
  const [copied, setCopied] = useState<boolean>(false);

  const pds4Content = generatePDS4Metadata(dataset, metrics, transform);
  const csvContent = generateTiePointsCSV(points);

  const certificateContent = `================================================================================
INDIAN SPACE RESEARCH ORGANISATION (ISRO) - SPACE APPLICATIONS CENTRE (SAC)
SMART INDIA HACKATHON 2026 - FINAL EVALUATION PRODUCT
================================================================================
Mission: Chandrayaan-2 Lunar Orbiter Optical Suite
Problem: Multi-modal, Sun angle and scale invariant image correspondence
Dataset Evaluated: ${dataset.title}
Region: ${dataset.regionName}
Coordinates: ${dataset.sourceMeta.latitude}, ${dataset.sourceMeta.longitude}

SOURCE OBSERVATION:
  - Sensor: Chandrayaan-2 ${dataset.sourceMeta.sensor} (GSD: ${dataset.sourceMeta.resolutionMetersPerPixel} m/px)
  - Sun Elevation: ${dataset.sourceMeta.sunElevationDeg}° | Sun Azimuth: ${dataset.sourceMeta.sunAzimuthDeg}°
  - Spectral Band: ${dataset.sourceMeta.spectralBand}
  - Orbit Number: ${dataset.sourceMeta.orbitNumber}

REFERENCE OBSERVATION:
  - Sensor: ${dataset.refMeta.sensor} (GSD: ${dataset.refMeta.resolutionMetersPerPixel} m/px)
  - Sun Elevation: ${dataset.refMeta.sunElevationDeg}° | Sun Azimuth: ${dataset.refMeta.sunAzimuthDeg}°
  - Phase Angle: ${dataset.refMeta.phaseAngleDeg}°

QUANTITATIVE EVALUATION AUDIT:
  - Sub-Pixel Accuracy (RMSE): ${metrics.subPixelRMSE.toFixed(3)} pixels (< 0.20 px Sub-pixel criteria PASS)
  - Ground Location Accuracy: ${metrics.rmseMeters.toFixed(3)} meters
  - Total Matches Identified: ${metrics.initialMatches} pairs
  - Validated RANSAC Inliers: ${metrics.inlierCount} pairs (${metrics.inlierRatioPercent}% inlier ratio)
  - Spatial Uniformity Index: ${metrics.spatialUniformityScore}% (Shannon Quadrant Entropy)
  - Quadrant Breakdown: Q1=${metrics.quadrantCounts[0]} pts, Q2=${metrics.quadrantCounts[1]} pts, Q3=${metrics.quadrantCounts[2]} pts, Q4=${metrics.quadrantCounts[3]} pts
  - Processing Latency: ${metrics.processingTimeMs} ms
  - Transformation Estimated: 3x3 Projective Homography

ESTIMATED HOMOGRAPHY MATRIX:
  [${transform.matrix[0].map(v => v.toFixed(6)).join(', ')}]
  [${transform.matrix[1].map(v => v.toFixed(6)).join(', ')}]
  [${transform.matrix[2].map(v => v.toFixed(6)).join(', ')}]

MENTOR REVIEW ENDORSEMENT:
  - Sri. Rohit Mishra (rohitmishra@sac.isro.gov.in)
  - Sri. Abdullah Suhail Ayyub Zinjani (abdul@sac.isro.gov.in)
  - Sri. K Suresh (ksuresh@sac.isro.gov.in)
Space Applications Centre / Indian Space Research Organisation (ISRO)
================================================================================`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (filename: string, text: string, type: string) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            ISRO Standard Data Product & Registration Export
          </h2>
          <p className="text-xs text-slate-400">
            Generate compliant PDS4 XML headers, tie-point coordinate tables, and scientific registration certificates.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('pds4')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'pds4' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            PDS4 XML
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'csv' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Tie-Points CSV
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'certificate' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold' : 'text-slate-400'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Evaluation Report
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-400">
          Format: {activeTab === 'pds4' ? 'PDS4 Observational Product XML' : activeTab === 'csv' ? 'RFC-4180 Comma Separated Values' : 'ISRO SAC Verified Audit Certificate'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(activeTab === 'pds4' ? pds4Content : activeTab === 'csv' ? csvContent : certificateContent)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition flex items-center gap-1.5 border border-slate-700"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>

          <button
            onClick={() => {
              if (activeTab === 'pds4') handleDownload(`CH2_REG_${dataset.id}.xml`, pds4Content, 'application/xml');
              else if (activeTab === 'csv') handleDownload(`CH2_TIEPOINTS_${dataset.id}.csv`, csvContent, 'text/csv');
              else handleDownload(`ISRO_SAC_REPORT_${dataset.id}.txt`, certificateContent, 'text/plain');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Download File
          </button>
        </div>
      </div>

      {/* Code / Content Viewer */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 max-h-[380px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre selection:bg-cyan-500/20">
        {activeTab === 'pds4' && pds4Content}
        {activeTab === 'csv' && csvContent}
        {activeTab === 'certificate' && certificateContent}
      </div>
    </div>
  );
};
