import type { Detector, RepoSignal } from "../core/signals";

function dependencyPattern(name: string): RegExp {
  return new RegExp(
    `(^|[\\s"'=,;([{<>])${name.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}([\\s"'=,.;\\])}<>]|$)`,
    "im",
  );
}

function hasDependency(text: string, dependency: string): boolean {
  return dependencyPattern(dependency).test(text);
}

function pushDetected(
  signals: RepoSignal[],
  text: string,
  source: string,
  detected: Array<[string, string, RepoSignal["kind"]]>,
): void {
  for (const [dependency, name, kind] of detected) {
    if (!hasDependency(text, dependency)) continue;
    signals.push({
      kind,
      name,
      confidence: "high",
      source,
      evidence: `${dependency} dependency detected`,
    });
  }
}

function hasSignal(signals: RepoSignal[], kind: RepoSignal["kind"], name: string): boolean {
  return signals.some((signal) => signal.kind === kind && signal.name === name);
}

function pythonRunner(files: { exists(path: string): boolean }, text: string): string {
  if (files.exists("uv.lock")) return "uv run";
  if (files.exists("poetry.lock") || text.includes("[tool.poetry]")) return "poetry run";
  return "python -m";
}

function pushCommand(
  signals: RepoSignal[],
  name: string,
  value: string,
  category: string,
  source: string,
  evidence: string,
): void {
  signals.push({
    kind: "command",
    name,
    confidence: "medium",
    source,
    evidence,
    metadata: { value, category },
  });
}

export const detectPython: Detector = async ({ files }) => {
  const source = files.exists("pyproject.toml")
    ? "pyproject.toml"
    : files.exists("requirements.txt")
      ? "requirements.txt"
      : files.exists("setup.py")
        ? "setup.py"
        : null;
  if (!source) return [];

  const text = (await files.readText(source)) ?? "";
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: "Python",
      confidence: "high",
      source,
      evidence: `${source} present`,
    },
  ];

  if (files.exists("uv.lock")) {
    signals.push({
      kind: "package-manager",
      name: "uv",
      confidence: "high",
      source: "uv.lock",
      evidence: "uv.lock present",
    });
  } else if (files.exists("poetry.lock") || text.includes("[tool.poetry]")) {
    signals.push({
      kind: "package-manager",
      name: "Poetry",
      confidence: files.exists("poetry.lock") ? "high" : "medium",
      source: files.exists("poetry.lock") ? "poetry.lock" : source,
      evidence: files.exists("poetry.lock") ? "poetry.lock present" : "Poetry config present",
    });
  } else if (files.exists("Pipfile.lock") || files.exists("Pipfile")) {
    signals.push({
      kind: "package-manager",
      name: "Pipenv",
      confidence: "high",
      source: files.exists("Pipfile.lock") ? "Pipfile.lock" : "Pipfile",
      evidence: files.exists("Pipfile.lock") ? "Pipfile.lock present" : "Pipfile present",
    });
  } else {
    signals.push({
      kind: "package-manager",
      name: "pip",
      confidence: source === "requirements.txt" ? "high" : "medium",
      source,
      evidence: source === "requirements.txt" ? "requirements.txt present" : `${source} present`,
    });
  }

  pushDetected(signals, text, source, [
    ["django", "Django", "framework"],
    ["fastapi", "FastAPI", "framework"],
    ["flask", "Flask", "framework"],
    ["pytest", "pytest", "test-framework"],
    ["ruff", "Ruff", "tool"],
    ["black", "Black", "tool"],
    ["mypy", "MyPy", "tool"],
  ]);

  const runner = pythonRunner(files, text);
  const commandPrefix = runner === "python -m" ? "python -m " : `${runner} `;

  if (hasDependency(text, "pytest") || text.includes("[tool.pytest")) {
    pushCommand(
      signals,
      "python_tests",
      `${commandPrefix}pytest`,
      "test",
      source,
      "pytest dependency or config detected",
    );
  }

  if (hasDependency(text, "ruff") || text.includes("[tool.ruff")) {
    pushCommand(
      signals,
      "python_lint",
      `${commandPrefix}ruff check .`,
      "lint",
      source,
      "Ruff dependency or config detected",
    );
  }

  if (hasDependency(text, "mypy") || text.includes("[tool.mypy")) {
    pushCommand(
      signals,
      "python_typecheck",
      `${commandPrefix}mypy .`,
      "typecheck",
      source,
      "MyPy dependency or config detected",
    );
  }

  return signals;
};

export const detectRust: Detector = async ({ files }) => {
  if (!files.exists("Cargo.toml")) return [];
  const text = (await files.readText("Cargo.toml")) ?? "";
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: "Rust",
      confidence: "high",
      source: "Cargo.toml",
      evidence: "Cargo.toml present",
    },
    {
      kind: "package-manager",
      name: "Cargo",
      confidence: "high",
      source: "Cargo.toml",
      evidence: "Cargo.toml present",
    },
  ];

  pushDetected(signals, text, "Cargo.toml", [
    ["axum", "Axum", "framework"],
    ["actix-web", "Actix Web", "framework"],
    ["tauri", "Tauri", "framework"],
    ["clap", "clap", "tool"],
    ["serde", "Serde", "tool"],
    ["tokio", "Tokio", "tool"],
  ]);

  if (files.exists("rust-toolchain.toml") || files.exists("rust-toolchain")) {
    signals.push({
      kind: "convention",
      name: "Rust toolchain pin",
      confidence: "high",
      source: files.exists("rust-toolchain.toml") ? "rust-toolchain.toml" : "rust-toolchain",
      evidence: "Rust toolchain file present",
    });
  }

  pushCommand(signals, "rust_tests", "cargo test", "test", "Cargo.toml", "Cargo.toml present");
  pushCommand(
    signals,
    "rust_format",
    "cargo fmt --check",
    "format",
    "Cargo.toml",
    "Cargo.toml present",
  );
  if (hasDependency(text, "clippy")) {
    pushCommand(
      signals,
      "rust_lint",
      "cargo clippy --all-targets --all-features",
      "lint",
      "Cargo.toml",
      "clippy dependency detected",
    );
  }

  return signals;
};

export const detectGo: Detector = async ({ files }) => {
  if (!files.exists("go.mod")) return [];
  const text = (await files.readText("go.mod")) ?? "";
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: "Go",
      confidence: "high",
      source: "go.mod",
      evidence: "go.mod present",
    },
    {
      kind: "package-manager",
      name: "Go modules",
      confidence: "high",
      source: "go.mod",
      evidence: "go.mod present",
    },
  ];

  pushDetected(signals, text, "go.mod", [
    ["github.com/gin-gonic/gin", "Gin", "framework"],
    ["github.com/labstack/echo", "Echo", "framework"],
    ["github.com/gofiber/fiber", "Fiber", "framework"],
    ["github.com/sqlc-dev/sqlc", "sqlc", "tool"],
    ["github.com/golangci/golangci-lint", "golangci-lint", "tool"],
  ]);

  pushCommand(signals, "go_tests", "go test ./...", "test", "go.mod", "go.mod present");
  pushCommand(signals, "go_format", "gofmt -w .", "format", "go.mod", "go.mod present");
  if (hasDependency(text, "github.com/golangci/golangci-lint")) {
    pushCommand(
      signals,
      "go_lint",
      "golangci-lint run",
      "lint",
      "go.mod",
      "github.com/golangci/golangci-lint dependency detected",
    );
  }

  return signals;
};

export const detectRuby: Detector = async ({ files }) => {
  if (!files.exists("Gemfile")) return [];
  const text = (await files.readText("Gemfile")) ?? "";
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: "Ruby",
      confidence: "high",
      source: "Gemfile",
      evidence: "Gemfile present",
    },
    {
      kind: "package-manager",
      name: "Bundler",
      confidence: "high",
      source: "Gemfile",
      evidence: "Gemfile present",
    },
  ];

  pushDetected(signals, text, "Gemfile", [
    ["rails", "Ruby on Rails", "framework"],
    ["rspec", "RSpec", "test-framework"],
    ["rubocop", "RuboCop", "tool"],
  ]);

  if (hasDependency(text, "rspec")) {
    pushCommand(
      signals,
      "ruby_tests",
      "bundle exec rspec",
      "test",
      "Gemfile",
      "rspec dependency detected",
    );
  } else if (hasDependency(text, "rails")) {
    pushCommand(
      signals,
      "ruby_tests",
      "bundle exec rails test",
      "test",
      "Gemfile",
      "rails dependency detected",
    );
  }

  if (hasDependency(text, "rubocop")) {
    pushCommand(
      signals,
      "ruby_lint",
      "bundle exec rubocop",
      "lint",
      "Gemfile",
      "rubocop dependency detected",
    );
  }

  return signals;
};

export const detectJava: Detector = async ({ files }) => {
  const source = files.exists("pom.xml")
    ? "pom.xml"
    : files.exists("build.gradle")
      ? "build.gradle"
      : files.exists("build.gradle.kts")
        ? "build.gradle.kts"
        : null;
  if (!source) return [];

  const text = (await files.readText(source)) ?? "";
  const manager = source === "pom.xml" ? "Maven" : "Gradle";
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: "Java",
      confidence: "high",
      source,
      evidence: `${source} present`,
    },
    {
      kind: "package-manager",
      name: manager,
      confidence: "high",
      source,
      evidence: `${source} present`,
    },
  ];

  pushDetected(signals, text, source, [
    ["spring-boot", "Spring Boot", "framework"],
    ["org.springframework.boot", "Spring Boot", "framework"],
    ["junit", "JUnit", "test-framework"],
    ["org.junit.jupiter", "JUnit", "test-framework"],
  ]);

  if (source.endsWith(".kts") || text.includes("kotlin(")) {
    signals.push({
      kind: "language",
      name: "Kotlin",
      confidence: "medium",
      source,
      evidence: "Kotlin Gradle config detected",
    });
  }

  if (
    !hasSignal(signals, "framework", "Spring Boot") &&
    text.includes("org.springframework.boot") &&
    text.includes("spring-boot")
  ) {
    signals.push({
      kind: "framework",
      name: "Spring Boot",
      confidence: "high",
      source,
      evidence: "Spring Boot dependency detected",
    });
  }

  const commandPrefix =
    source === "pom.xml" ? "mvn" : files.exists("gradlew") ? "./gradlew" : "gradle";
  pushCommand(signals, "java_tests", `${commandPrefix} test`, "test", source, `${source} present`);

  return signals;
};

export const detectDotNet: Detector = async ({ files }) => {
  const projects = await files.listFiles(["*.csproj", "*.fsproj", "*.sln"]);
  if (projects.length === 0) return [];
  const source = projects[0] ?? "*.csproj";
  const text = (await files.readText(source)) ?? "";
  const signals: RepoSignal[] = [
    {
      kind: "language",
      name: source.endsWith(".fsproj") ? "F#" : "C#",
      confidence: "high",
      source,
      evidence: `${source.split("/").pop()} present`,
    },
    {
      kind: "package-manager",
      name: ".NET SDK",
      confidence: "high",
      source,
      evidence: `${source.split("/").pop()} present`,
    },
  ];

  pushDetected(signals, text, source, [
    ["Microsoft.AspNetCore", "ASP.NET Core", "framework"],
    ["xunit", "xUnit", "test-framework"],
    ["NUnit", "NUnit", "test-framework"],
  ]);

  if (!hasSignal(signals, "framework", "ASP.NET Core") && text.includes("Microsoft.NET.Sdk.Web")) {
    signals.push({
      kind: "framework",
      name: "ASP.NET Core",
      confidence: "high",
      source,
      evidence: "Microsoft.NET.Sdk.Web detected",
    });
  }

  pushCommand(signals, "dotnet_tests", "dotnet test", "test", source, `${source} present`);
  pushCommand(
    signals,
    "dotnet_format",
    "dotnet format --verify-no-changes",
    "format",
    source,
    `${source} present`,
  );

  return signals;
};
