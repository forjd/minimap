import { describe, test } from "bun:test";

import { detectApple } from "../src/detectors/apple";
import { detectC } from "../src/detectors/c";
import { detectCi } from "../src/detectors/ci";
import { detectDeployment } from "../src/detectors/deployment";
import { detectDocs } from "../src/detectors/docs";
import {
  detectDotNet,
  detectGo,
  detectJava,
  detectPython,
  detectRuby,
  detectRust,
} from "../src/detectors/ecosystems";
import { detectFrontend } from "../src/detectors/frontend";
import { detectInfrastructure } from "../src/detectors/infrastructure";
import { detectLaravel } from "../src/detectors/laravel";
import { detectNode } from "../src/detectors/node";
import { detectPhp } from "../src/detectors/php";
import { detectTesting } from "../src/detectors/testing";
import { detectWorkspaces } from "../src/detectors/workspaces";
import { expectDetectorContract } from "./helpers/detector-contract";

describe("detector contracts", () => {
  test("node detector", async () => {
    await expectDetectorContract(detectNode, {
      "package.json": {
        type: "module",
        bin: "bin/example.js",
        dependencies: { typescript: "^5.0.0", vite: "^7.0.0" },
        scripts: { dev: "vite", test: "bun test", deploy: "npm publish" },
      },
      "bun.lock": "",
    });
  });

  test("php detector", async () => {
    await expectDetectorContract(detectPhp, {
      "composer.json": {
        require: { php: "^8.3", "laravel/framework": "^12.0" },
        "require-dev": { "pestphp/pest": "^3.0" },
        scripts: { test: "pest", reset: "php artisan migrate:fresh" },
      },
    });
  });

  test("laravel detector", async () => {
    await expectDetectorContract(detectLaravel, {
      "composer.json": { require: { "laravel/framework": "^12.0" } },
    });
  });

  test("frontend detector", async () => {
    await expectDetectorContract(detectFrontend, {
      "package.json": {
        dependencies: {
          "@angular/core": "^20.0.0",
          "@remix-run/react": "^2.0.0",
          astro: "^5.0.0",
          oxlint: "^1.0.0",
          react: "^19.0.0",
          tailwindcss: "^4.0.0",
          vite: "^7.0.0",
        },
      },
      "vite.config.ts": "",
      "tailwind.config.ts": "",
    });
  });

  test("testing detector", async () => {
    await expectDetectorContract(detectTesting, {
      "package.json": {
        dependencies: { vitest: "^3.0.0", "@playwright/test": "^1.0.0" },
        scripts: { test: "bun test" },
      },
      "phpunit.xml": "<phpunit />",
    });
  });

  test("ci detector", async () => {
    await expectDetectorContract(detectCi, {
      ".github/workflows/ci.yml": "name: CI\non: [push]\n",
    });
  });

  test("infrastructure detector", async () => {
    await expectDetectorContract(detectInfrastructure, {
      Dockerfile: "FROM oven/bun",
      Makefile: "test:\n\tbun test\n",
      "docker-compose.yml": "services: {}\n",
    });
  });

  test("deployment detector", async () => {
    await expectDetectorContract(detectDeployment, {
      "wrangler.toml": 'name = "example"\n',
      "k8s/deployment.yaml": "apiVersion: apps/v1\n",
    });
  });

  test("docs detector", async () => {
    await expectDetectorContract(detectDocs, {
      "README.md": "# Example\n",
      "skills/example/SKILL.md": "# Skill\n",
    });
  });

  test("apple detector", async () => {
    await expectDetectorContract(detectApple, {
      "Package.swift": "// swift-tools-version: 6.0\n",
      "Sources/App/main.swift": "import SwiftUI\n",
    });
  });

  test("c detector", async () => {
    await expectDetectorContract(detectC, {
      "CMakeLists.txt": "cmake_minimum_required(VERSION 3.29)\n",
      "src/main.c": "int main(void) { return 0; }\n",
      "src/app.cpp": "int app() { return 0; }\n",
    });
  });

  test("python detector", async () => {
    await expectDetectorContract(detectPython, {
      "pyproject.toml": '[project]\ndependencies = ["fastapi", "pytest", "ruff"]\n',
      "uv.lock": "",
    });
  });

  test("rust detector", async () => {
    await expectDetectorContract(detectRust, {
      "Cargo.toml": '[dependencies]\ntauri = "2"\n',
      "rust-toolchain.toml": '[toolchain]\nchannel = "stable"\n',
    });
  });

  test("go detector", async () => {
    await expectDetectorContract(detectGo, {
      "go.mod": "module example\nrequire github.com/gin-gonic/gin v1.10.0\n",
    });
  });

  test("ruby detector", async () => {
    await expectDetectorContract(detectRuby, {
      Gemfile: 'gem "rails"\ngem "rspec"\n',
    });
  });

  test("java detector", async () => {
    await expectDetectorContract(detectJava, {
      "pom.xml": "<dependency><artifactId>spring-boot</artifactId></dependency>\n",
    });
  });

  test("dotnet detector", async () => {
    await expectDetectorContract(detectDotNet, {
      "App.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PackageReference Include="xunit" /></Project>\n',
    });
  });

  test("workspaces detector", async () => {
    await expectDetectorContract(detectWorkspaces, {
      "package.json": { workspaces: ["apps/*"] },
      "pnpm-lock.yaml": "",
      "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
      "apps/web/package.json": { name: "web" },
      "turbo.json": "{}",
    });
  });
});
