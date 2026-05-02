import type { Detector, RepoSignal } from "../core/signals";

export const detectC: Detector = async ({ files }) => {
  const cFiles = await files.listFiles(["*.c", "src/**/*.c"]);
  const cppFiles = await files.listFiles([
    "*.cc",
    "*.cpp",
    "*.cxx",
    "src/**/*.cc",
    "src/**/*.cpp",
    "src/**/*.cxx",
  ]);
  const headers = await files.listFiles(["*.h", "*.hpp", "include/**/*.h", "include/**/*.hpp"]);
  const hasCMake = files.exists("CMakeLists.txt");
  const hasCompileCommands = files.exists("compile_commands.json");

  if (
    cFiles.length === 0 &&
    cppFiles.length === 0 &&
    headers.length === 0 &&
    !hasCMake &&
    !hasCompileCommands
  ) {
    return [];
  }

  const signals: RepoSignal[] = [];

  if (cFiles.length > 0 || (headers.length > 0 && cppFiles.length === 0)) {
    signals.push({
      kind: "language",
      name: "C",
      confidence: cFiles.length > 0 ? "high" : "medium",
      source: cFiles[0] ?? headers[0] ?? "*.c",
      evidence: cFiles.length > 0 ? "C source file detected" : "C header file detected",
    });
  }

  if (cppFiles.length > 0) {
    signals.push({
      kind: "language",
      name: "C++",
      confidence: "high",
      source: cppFiles[0] ?? "*.cpp",
      evidence: "C++ source file detected",
    });
  }

  if (hasCMake) {
    signals.push({
      kind: "tool",
      name: "CMake",
      confidence: "high",
      source: "CMakeLists.txt",
      evidence: "CMakeLists.txt present",
    });
  }

  if (hasCompileCommands) {
    signals.push({
      kind: "tool",
      name: "compile_commands.json",
      confidence: "high",
      source: "compile_commands.json",
      evidence: "compile_commands.json present",
    });
  }

  return signals;
};
