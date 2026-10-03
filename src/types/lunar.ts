export type SensorType = 'OHRC' | 'TMC-2' | 'IIRS' | 'LRO-NAC' | 'SELENE';

export interface LunarMetadata {
  sensor: SensorType;
  resolutionMetersPerPixel: number;
  sunElevationDeg: number;
  sunAzimuthDeg: number;
  incidenceAngleDeg: number;
  emissionAngleDeg: number;
  phaseAngleDeg: number;
  orbitNumber: number;
  acquisitionDate: string;
  spectralBand: string;
  altitudeKm: number;
  latitude: string;
  longitude: string;
  targetFeature: string;
}

export interface CorrespondencePoint {
  id: number;
  // Source coordinates (moving image)
  srcX: number;
  srcY: number;
  // Reference coordinates (fixed image)
  refX: number;
  refY: number;
  // Warped source coordinates after registration
  warpedSrcX: number;
  warpedSrcY: number;
  // Sub-pixel refined coordinates
  refinedRefX: number;
  refinedRefY: number;
  subPixelDx: number;
  subPixelDy: number;
  residualPx: number;
  residualMeters: number;
  inlier: boolean;
  quadrant: 1 | 2 | 3 | 4; // Top-Left, Top-Right, Bottom-Left, Bottom-Right
  featureType: 'crater_rim' | 'central_peak' | 'boulder_cluster' | 'ridge_crest' | 'rille_edge';
  confidence: number;
}

export interface TransformMatrix {
  matrix: [
    [number, number, number],
    [number, number, number],
    [number, number, number]
  ];
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
  translationX: number;
  translationY: number;
  shear: number;
  type: 'Rigid' | 'Similarity' | 'Affine' | 'Homography' | 'TPS';
}

export interface PipelineMetrics {
  rmsePixels: number;
  rmseMeters: number;
  subPixelRMSE: number;
  totalDetectedSource: number;
  totalDetectedRef: number;
  initialMatches: number;
  inlierCount: number;
  inlierRatioPercent: number;
  quadrantCounts: [number, number, number, number];
  spatialUniformityScore: number; // 0 - 100%
  processingTimeMs: number;
  maxResidualPx: number;
  scaleRatio: number;
  sunAngleDivergenceDeg: number;
}

export interface LunarDatasetPair {
  id: string;
  title: string;
  regionName: string;
  description: string;
  scientificContext: string;
  sourceMeta: LunarMetadata;
  refMeta: LunarMetadata;
  sourceImageUrl: string;
  refImageUrl: string;
  seed: number;
  difficulty: 'Moderate' | 'High' | 'Extreme';
  challengeHighlight: string;
  defaultTransform: TransformMatrix;
  isCustomUpload?: boolean;
}

export type ViewMode = 
  | 'side_by_side' 
  | 'curtain_split' 
  | 'checkerboard' 
  | 'difference_heatmap' 
  | 'flicker_comparator'
  | 'edge_blend';

export type PipelineStage = 
  | 'acquisition'
  | 'preprocessing'
  | 'feature_detection'
  | 'ai_matching'
  | 'validation'
  | 'registration'
  | 'subpixel_refinement'
  | 'registered_product';
