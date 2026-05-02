import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { scanRepo } from "../src/core/scan-repo";
import { renderAgentContext } from "../src/renderers/render-agent-context";

const fixture = (name: string) => join(import.meta.dir, "fixtures", name);

describe("renderAgentContext", () => {
  test("renders node vite vue snapshot", async () => {
    const scan = await scanRepo(fixture("node-vite-vue"));
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("renders node cli snapshot", async () => {
    const scan = await scanRepo(fixture("node-cli"));
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("renders laravel vue inertia snapshot", async () => {
    const scan = await scanRepo(fixture("laravel-vue-inertia"));
    expect(renderAgentContext(scan)).toMatchSnapshot();
  });

  test("summarizes expanded ecosystem projects", async () => {
    const scan = await scanRepo(fixture("expanded-ecosystems"));
    expect(renderAgentContext(scan)).toContain(
      "FastAPI + Ruby on Rails + Spring Boot + ASP.NET Core + Python + Rust + Go + Ruby + Java + C# project using Docker, Docker Compose, Cargo, Go modules, uv, .NET SDK.",
    );
  });
});
