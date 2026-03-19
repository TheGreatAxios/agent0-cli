#!/usr/bin/env bun
/**
 * Bun Cross-Compilation Build Script
 * 
 * Builds standalone executables for multiple platforms using Bun's compile feature.
 * 
 * Usage:
 *   bun run scripts/build-bun.ts                    # Build for current platform
 *   bun run scripts/build-bun.ts --all             # Build for all platforms
 *   bun run scripts/build-bun.ts --target=linux    # Build for specific platform
 *   bun run scripts/build-bun.ts --minify         # Enable minification
 *   bun run scripts/build-bun.ts --bytecode       # Enable bytecode compilation
 */

import { $ } from "bun";
import { parseArgs } from "util";

// Supported build targets
const TARGETS = [
  "bun-darwin-arm64",     // macOS Apple Silicon
  "bun-darwin-x64",       // macOS Intel
  "bun-linux-x64",        // Linux x64
  "bun-linux-arm64",      // Linux ARM64
  "bun-windows-x64",      // Windows x64
] as const;

type Target = typeof TARGETS[number];

// Parse CLI arguments
const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    all: { type: "boolean", default: false },
    target: { type: "string" },
    minify: { type: "boolean", default: true },
    bytecode: { type: "boolean", default: false },
    sourcemap: { type: "string", default: "linked" },
    help: { type: "boolean", default: false },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Bun Cross-Compilation Build Script

Usage:
  bun run scripts/build-bun.ts [options]

Options:
  --all              Build for all supported platforms
  --target=<target>  Build for specific platform (e.g., bun-linux-x64)
  --minify           Enable minification (default: true)
  --bytecode         Enable bytecode compilation for faster startup
  --sourcemap=<type> Sourcemap type: none, linked, external, inline (default: linked)
  --help             Show this help message

Supported targets:
  ${TARGETS.join("\n  ")}

Examples:
  bun run scripts/build-bun.ts                     # Build for current platform
  bun run scripts/build-bun.ts --all             # Build all platforms
  bun run scripts/build-bun.ts --target=bun-linux-x64 --bytecode
`);
  process.exit(0);
}

// Build configuration
interface BuildConfig {
  target?: Target;
  minify: boolean;
  bytecode: boolean;
  sourcemap: "none" | "linked" | "external" | "inline";
}

const config: BuildConfig = {
  target: values.target as Target | undefined,
  minify: values.minify,
  bytecode: values.bytecode,
  sourcemap: values.sourcemap as BuildConfig["sourcemap"],
};

// Get version from package.json
const packageJson = await Bun.file("./package.json").json();
const version = packageJson.version;

console.log(`🔨 Building ag0 CLI v${version}\n`);

// Determine which targets to build
const targetsToBuild: (Target | undefined)[] = values.all 
  ? [...TARGETS] 
  : [config.target];

// Build for each target
for (const target of targetsToBuild) {
  const targetName = target || "native";
  const outputName = target?.includes("windows") ? "ag0.exe" : "ag0";
  const outputDir = target ? `./dist/${target.replace("bun-", "")}` : "./dist";
  const outputPath = `${outputDir}/${outputName}`;
  
  console.log(`📦 Building for ${targetName}...`);
  
  try {
    // Ensure output directory exists
    await $`mkdir -p ${outputDir}`;
    
    // Build with Bun
    const buildArgs = [
      "build",
      "./src/cli.ts",
      "--compile",
      "--outfile", outputPath,
    ];
    
    if (target) {
      buildArgs.push("--target", target);
    }
    
    if (config.minify) {
      buildArgs.push("--minify");
    }
    
    if (config.bytecode) {
      buildArgs.push("--bytecode");
    }
    
    if (config.sourcemap !== "none") {
      buildArgs.push("--sourcemap", config.sourcemap);
    }
    
    // Add define for version
    buildArgs.push(
      "--define", `BUILD_VERSION='"${version}"'`,
      "--define", `BUILD_TIME='"${new Date().toISOString()}"'`
    );
    
    const result = await $`bun ${buildArgs}`;
    
    if (result.exitCode === 0) {
      // Get file size
      const stats = await Bun.file(outputPath).stat();
      const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
      
      console.log(`  ✅ ${outputPath} (${sizeMB} MB)`);
      
      // Make executable on Unix systems
      if (!target?.includes("windows")) {
        await $`chmod +x ${outputPath}`;
      }
    } else {
      console.error(`  ❌ Build failed for ${targetName}`);
      console.error(result.stderr);
    }
  } catch (error) {
    console.error(`  ❌ Error building for ${targetName}:`, error);
  }
}

console.log(`\n✨ Build complete!`);

// Print usage instructions
if (values.all || values.target) {
  console.log(`
📋 Distribution files created in ./dist/

To distribute:
  1. Zip each platform directory
  2. Upload to GitHub Releases
  3. Update installation instructions

Example installation:
  curl -L https://github.com/yourusername/agent0-cli/releases/download/v${version}/ag0-$(uname -s)-$(uname -m) -o ag0
  chmod +x ag0
  ./ag0 --version
`);
}
