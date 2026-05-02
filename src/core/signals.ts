export type SignalKind =
  | "language"
  | "framework"
  | "tool"
  | "package-manager"
  | "command"
  | "test-framework"
  | "architecture"
  | "convention"
  | "risk";

export type Confidence = "high" | "medium" | "low";

export type RepoSignal = {
  kind: SignalKind;
  name: string;
  confidence: Confidence;
  source: string;
  evidence: string;
  metadata?: Record<string, unknown>;
};

export type RepoScan = {
  cwd: string;
  generatedAt: string;
  signals: RepoSignal[];
  filesRead: string[];
  warnings: string[];
};

export type RepoFileMap = {
  exists(path: string): boolean;
  readText(path: string): Promise<string | null>;
  readJson<T = unknown>(path: string): Promise<T | null>;
  listFiles(patterns: string[]): Promise<string[]>;
};

export type DetectorContext = {
  cwd: string;
  files: RepoFileMap;
  warnings: string[];
};

export type Detector = (context: DetectorContext) => Promise<RepoSignal[]>;
