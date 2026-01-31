#!/usr/bin/env bun
/**
 * Compile TypeScript to .vjs using Bun's bundler
 *
 * Compiles: src/gamemode.ts -> dist/gamemode.vjs
 *
 * Usage:
 *   bun tools/build/compile-all.mjs          # One-time build
 *   bun tools/build/compile-all.mjs --watch  # Watch mode
 */

import { watch } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "../../src");
const outDir = join(__dirname, "../../dist");

// Entry point configuration
const entryPoint = {
  input: join(srcDir, "gamemode.ts"),
  output: join(outDir, "gamemode.vjs"),
  name: "gamemode",
};

// Verify entry point exists
if (!existsSync(entryPoint.input)) {
  console.error(`Entry point not found: ${entryPoint.input}`);
  process.exit(1);
}

const isWatch = process.argv.includes("--watch");

// Bun build configuration
const buildOptions = {
  format: "esm",
  target: "browser",
  external: ["cs_script/point_script"],
};

/**
 * Build the gamemode using Bun's native bundler
 */
async function buildFile(input, output, name) {
  try {
    const result = await Bun.build({
      entrypoints: [input],
      outdir: dirname(output),
      naming: `${name}.vjs`,
      ...buildOptions,
    });

    if (!result.success) {
      console.error(`Build failed for ${name}:`, result.logs);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Build error for ${name}:`, error);
    return false;
  }
}

async function main() {
  console.log(`Entry: ${entryPoint.name}.ts`);

  if (isWatch) {
    // Initial build
    console.log(`Building: ${entryPoint.name}.ts -> ${entryPoint.name}.vjs`);
    const success = await buildFile(entryPoint.input, entryPoint.output, entryPoint.name);

    if (success) {
      console.log("Initial build complete!");
    }

    console.log("");
    console.log("Watching for changes... (Ctrl+C to stop)");
    console.log("");

    // Watch the src directory
    const watcher = watch(srcDir, { recursive: true }, async (_event, filename) => {
      if (filename && filename.endsWith(".ts")) {
        console.log(`Change: ${filename}`);
        await buildFile(entryPoint.input, entryPoint.output, entryPoint.name);
        console.log(`Rebuilt: ${entryPoint.name}.vjs`);
      }
    });

    // Clean shutdown
    process.on("SIGINT", () => {
      console.log("\nStopping...");
      watcher.close();
      process.exit(0);
    });
  } else {
    // One-time build
    console.log(`Building: ${entryPoint.name}.ts -> ${entryPoint.name}.vjs`);
    const success = await buildFile(entryPoint.input, entryPoint.output, entryPoint.name);

    if (success) {
      console.log("Build complete!");
    } else {
      console.error("Build failed");
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error("Build failed:", error);
  process.exit(1);
});
