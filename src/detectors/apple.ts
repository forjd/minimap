import type { Detector, RepoSignal } from "../core/signals";

export const detectApple: Detector = async ({ files }) => {
  const swiftFiles = await files.listFiles(["*.swift", "Sources/**/*.swift", "src/**/*.swift"]);
  const xcodeProjects = await files.listFiles([
    "*.xcodeproj/project.pbxproj",
    "*.xcworkspace/contents.xcworkspacedata",
  ]);
  const hasSwiftPackage = files.exists("Package.swift");

  if (!hasSwiftPackage && swiftFiles.length === 0 && xcodeProjects.length === 0) return [];

  const source = hasSwiftPackage
    ? "Package.swift"
    : (swiftFiles[0] ?? xcodeProjects[0] ?? "*.swift");
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: "Swift",
      confidence: hasSwiftPackage || swiftFiles.length > 0 ? "high" : "medium",
      source,
      evidence: hasSwiftPackage ? "Package.swift present" : "Swift source file detected",
    },
  ];

  if (hasSwiftPackage) {
    signals.push({
      kind: "package-manager",
      name: "SwiftPM",
      confidence: "high",
      source: "Package.swift",
      evidence: "Package.swift present",
    });
  }

  if (xcodeProjects.length > 0) {
    signals.push({
      kind: "tool",
      name: "Xcode",
      confidence: "high",
      source: xcodeProjects[0] ?? "*.xcodeproj",
      evidence: "Xcode project or workspace present",
    });
  }

  for (const swiftFile of swiftFiles.slice(0, 10)) {
    const text = await files.readText(swiftFile);
    if (!text?.includes("SwiftUI")) continue;
    signals.push({
      kind: "framework",
      name: "SwiftUI",
      confidence: "high",
      source: swiftFile,
      evidence: "SwiftUI import detected",
    });
    break;
  }

  return signals;
};
