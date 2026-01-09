#!/usr/bin/env bun
import { readFile, writeFile, copyFile, chmod, access } from "fs/promises";
import { join, resolve } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, readdirSync, readFileSync } from "fs";
import { colorize, header, section } from "../utils/colors.mjs";

const execAsync = promisify(exec);
const PROJECT_ROOT = process.env.npm_package_json_dir || process.cwd();

// ============================================================================
// PLATFORM DETECTION & PATH UTILITIES
// ============================================================================

function detectPlatform() {
  const platform = process.platform;

  // Detect WSL2
  if (platform === "linux") {
    try {
      const wslCheck = readFileSync("/proc/version", "utf8").toLowerCase();
      if (wslCheck.includes("microsoft")) {
        return { type: "wsl2", os: "linux" };
      }
    } catch {
      // Not WSL2
    }
  }

  return { type: platform, os: platform };
}

function isWSL2() {
  if (process.platform !== "linux") return false;
  try {
    const wslCheck = readFileSync("/proc/version", "utf8").toLowerCase();
    return wslCheck.includes("microsoft");
  } catch {
    return false;
  }
}

/**
 * Convert Windows path to WSL2 path
 * C:\Users\Name\path -> /mnt/c/Users/Name/path
 */
function windowsToWSL2Path(windowsPath) {
  if (!windowsPath) return null;
  const drive = windowsPath.charAt(0).toLowerCase();
  const rest = windowsPath.slice(2).replace(/\\/g, "/");
  return `/mnt/${drive}${rest}`;
}

/**
 * Normalize path for current platform
 */
function normalizePath(path) {
  if (!path) return null;
  return resolve(path);
}

/**
 * Expand home directory
 */
function expandHome(path) {
  if (path.startsWith("~")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    return path.replace("~", home);
  }
  return path;
}

// ============================================================================
// CS2 INSTALLATION PATH DISCOVERY
// ============================================================================

const COMMON_STEAM_PATHS = {
  windows: [
    "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
    "C:\\Program Files\\Steam\\steamapps\\common\\Counter-Strike Global Offensive",
    "D:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
    "E:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
    "F:\\SteamLibrary\\steamapps\\common\\Counter-Strike Global Offensive",
  ],
  wsl2: [
    "/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/c/Program Files/Steam/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/d/SteamLibrary/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/e/SteamLibrary/steamapps/common/Counter-Strike Global Offensive",
    "/mnt/f/SteamLibrary/steamapps/common/Counter-Strike Global Offensive",
  ],
  macos: [
    "~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive",
    "/Applications/Steam.app/Contents/MacOS/steamapps/common/Counter-Strike Global Offensive",
  ],
  linux: [
    "~/.steam/steam/steamapps/common/Counter-Strike Global Offensive",
    "~/.local/share/Steam/steamapps/common/Counter-Strike Global Offensive",
    "~/snap/steam/common/.steam/steam/steamapps/common/Counter-Strike Global Offensive",
  ],
};

const RELATIVE_TYPE_PATH = "content/csgo/maps/editor/zoo/scripts/point_script.d.ts";

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function validateCS2Path(basePath) {
  if (!basePath) return null;
  const typePath = join(basePath, RELATIVE_TYPE_PATH);
  if (await fileExists(typePath)) {
    return typePath;
  }
  return null;
}

async function findCS2Installation() {
  const platform = detectPlatform();

  // Priority 1: Check environment variable
  if (process.env.CS2_INSTALL_PATH) {
    const envPath = expandHome(process.env.CS2_INSTALL_PATH);
    const validated = await validateCS2Path(envPath);
    if (validated) {
      return validated;
    }
    // Env var was set but invalid - report this explicitly
    throw new Error(
      `CS2_INSTALL_PATH environment variable is set but invalid:\n` +
        `  Path: ${envPath}\n` +
        `  Expected file not found at: ${join(envPath, RELATIVE_TYPE_PATH)}`
    );
  }

  // Priority 2: Search common paths
  let searchPaths = [];
  if (platform.type === "wsl2") {
    searchPaths = COMMON_STEAM_PATHS.wsl2;
  } else if (platform.type === "win32") {
    searchPaths = COMMON_STEAM_PATHS.windows;
  } else if (platform.type === "darwin") {
    searchPaths = COMMON_STEAM_PATHS.macos;
  } else if (platform.type === "linux") {
    searchPaths = COMMON_STEAM_PATHS.linux;
  }

  for (const basePath of searchPaths) {
    const expanded = expandHome(basePath);
    const validated = await validateCS2Path(expanded);
    if (validated) {
      return validated;
    }
  }

  return null;
}

// ============================================================================
// ERROR MESSAGES
// ============================================================================

function getSetupInstructions() {
  const platform = detectPlatform();
  let instructions = [];

  if (platform.type === "wsl2" || platform.type === "win32") {
    instructions.push(
      colorize("Windows / WSL2 Setup:", "yellow"),
      "  1. Set the CS2_INSTALL_PATH environment variable:",
      '     PowerShell:  $env:CS2_INSTALL_PATH="C:\\\\Program Files (x86)\\\\Steam\\\\steamapps\\\\common\\\\Counter-Strike Global Offensive"',
      "     CMD:         set CS2_INSTALL_PATH=C:\\\\Program Files (x86)\\\\Steam\\\\steamapps\\\\common\\\\Counter-Strike Global Offensive",
      '     Linux/WSL:   export CS2_INSTALL_PATH="/path/to/Counter-Strike Global Offensive"'
    );
  } else if (platform.type === "darwin") {
    instructions.push(
      colorize("macOS Setup:", "yellow"),
      "  1. Set the CS2_INSTALL_PATH environment variable:",
      '     export CS2_INSTALL_PATH="~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive"',
      "  2. Add to ~/.zprofile or ~/.bash_profile for persistence"
    );
  } else if (platform.type === "linux") {
    instructions.push(
      colorize("Linux Setup:", "yellow"),
      "  1. Set the CS2_INSTALL_PATH environment variable:",
      '     export CS2_INSTALL_PATH="~/.steam/steam/steamapps/common/Counter-Strike Global Offensive"',
      "  2. Add to ~/.bashrc or ~/.profile for persistence"
    );
  }

  return instructions.join("\n");
}

function displaySearchedPaths() {
  const platform = detectPlatform();
  let searchPaths = [];

  if (platform.type === "wsl2") {
    searchPaths = COMMON_STEAM_PATHS.wsl2;
  } else if (platform.type === "win32") {
    searchPaths = COMMON_STEAM_PATHS.windows;
  } else if (platform.type === "darwin") {
    searchPaths = COMMON_STEAM_PATHS.macos;
  } else if (platform.type === "linux") {
    searchPaths = COMMON_STEAM_PATHS.linux;
  }

  console.log("");
  console.log(colorize("Searched paths:", "yellow"));
  searchPaths.forEach((path) => {
    console.log(`  - ${path}`);
  });
  console.log("");
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

async function compareFiles(file1, file2) {
  try {
    const content1 = await readFile(file1, "utf8");
    const content2 = await readFile(file2, "utf8");
    return content1 === content2;
  } catch {
    return false;
  }
}

async function getDiff(oldFile, newFile) {
  try {
    const { stdout } = await execAsync(`diff -u "${oldFile}" "${newFile}"`);
    return stdout;
  } catch (err) {
    // diff returns non-zero when files differ
    return err.stdout || "";
  }
}

const TARGET = join(PROJECT_ROOT, "src/types/cs_script.d.ts");
const CHANGELOG_PATH = join(PROJECT_ROOT, "docs/API_CHANGELOG.md");

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  header("CS2 Type Definitions Sync Tool");

  console.log(colorize("Platform:", "blue"), detectPlatform().type);
  console.log(colorize("Target:", "blue"), TARGET);
  console.log("");

  // Find CS2 installation
  let SOURCE;
  try {
    SOURCE = await findCS2Installation();
  } catch (err) {
    console.log(colorize("❌ ERROR:", "red"), err.message);
    console.log("");
    console.log(getSetupInstructions());
    console.log("");
    process.exit(1);
  }

  if (!SOURCE) {
    console.log(colorize("❌ ERROR: CS2 installation not found!", "red"));
    console.log("");
    console.log(colorize("Checked paths:", "yellow"));
    displaySearchedPaths();
    console.log(getSetupInstructions());
    console.log("");
    process.exit(1);
  }

  console.log(colorize("✓ CS2 installation found", "green"));
  console.log(colorize("Source:", "blue"), SOURCE);
  console.log("");

  // Check if files are identical
  if (await fileExists(TARGET)) {
    const identical = await compareFiles(TARGET, SOURCE);
    if (identical) {
      console.log(colorize("✓ No changes detected (files are identical)", "green"));
      console.log(colorize("Type definitions are already up to date.", "yellow"));
      console.log("");
      process.exit(0);
    } else {
      console.log(colorize("⚠️  Changes detected between local and installed versions", "yellow"));
    }
  } else {
    console.log(colorize("⚠️  No existing type definitions found (first sync)", "yellow"));
  }

  // Generate diff before copying
  let diffOutput = "";
  if (await fileExists(TARGET)) {
    console.log(colorize("Generating diff for changelog...", "blue"));
    diffOutput = await getDiff(TARGET, SOURCE);
  }

  // Copy the file
  section("Copying Type Definitions");

  // Remove read-only protection
  console.log(colorize("Removing read-only protection...", "blue"));
  try {
    await chmod(TARGET, 0o644);
  } catch {
    // Ignore if file doesn't exist
  }

  // Copy
  await copyFile(SOURCE, TARGET);

  // Show diff summary
  if (diffOutput) {
    console.log("");
    console.log(colorize("=== Changes Summary ===", "cyan"));
    const lines = diffOutput.split("\n");
    console.log(colorize(lines.slice(0, 20).join("\n"), "yellow"));
    if (lines.length > 20) {
      console.log(colorize(`... (${lines.length - 20} more lines)`, "yellow"));
    }
    console.log("");
  }

  // Restore read-only protection
  console.log(colorize("Restoring read-only protection...", "blue"));
  await chmod(TARGET, 0o444);

  // Verify
  const stats = await readFile(TARGET, "utf8");
  const lineCount = stats.split("\n").length;
  const byteSize = Buffer.byteLength(stats, "utf8");

  console.log(colorize("✓ Type definitions synced successfully", "green"));
  console.log(colorize(`  Size: ${byteSize} bytes`, "blue"));
  console.log(colorize(`  Lines: ${lineCount}`, "blue"));
  console.log("");

  // Update changelog if changes detected
  if (diffOutput) {
    section("Changelog Documentation");
    console.log(colorize("Changes detected in type definitions!", "yellow"));
    console.log("");

    const timestamp = new Date().toISOString().split("T")[0];
    const diffFile = join(PROJECT_ROOT, `type-diff-${timestamp}.txt`);
    await writeFile(diffFile, diffOutput);

    console.log(colorize("Full diff saved to:", "blue"), diffFile);
    console.log("");

    const changelogTemplate = `## [${timestamp}] - API Update

### Added

- **New Methods/Events** - Describe new additions
  - \`Method.Name()\` - Description of what it does
  - **Impact**: How this affects developers
  - **Example**:
  \`\`\`typescript
  // Usage example
  \`\`\`

### Changed

- **Modified Methods/Events** - Describe changes to existing APIs
  - **Impact**: How existing code is affected
  - **Migration**:
  \`\`\`typescript
  // ❌ OLD:
  // old way
  
  // ✅ NEW:
  // new way
  \`\`\`

### Deprecated

- **Deprecated Methods** - Methods marked as deprecated
  - \`OldMethod()\` - Use \`NewMethod()\` instead
  - **Reason**: Why the change was made

### Notes

- Additional context about this update
- Testing recommendations
- Performance implications

---

`;

    // Insert into changelog
    if (await fileExists(CHANGELOG_PATH)) {
      console.log(colorize("Updating API_CHANGELOG.md...", "blue"));

      const changelog = await readFile(CHANGELOG_PATH, "utf8");
      const backup = `${CHANGELOG_PATH}.backup-${timestamp}`;
      await writeFile(backup, changelog);

      // Find first ## [ line and insert before it
      const firstEntryMatch = changelog.match(/^## \[/m);
      if (firstEntryMatch) {
        const insertIndex = changelog.indexOf(firstEntryMatch[0]);
        const newChangelog =
          changelog.slice(0, insertIndex) + changelogTemplate + changelog.slice(insertIndex);

        await chmod(CHANGELOG_PATH, 0o644);
        await writeFile(CHANGELOG_PATH, newChangelog);
        await chmod(CHANGELOG_PATH, 0o444);

        console.log(colorize("✓ Changelog template added", "green"));
        console.log(colorize("  Backup saved to:", "blue"), backup);
      }
    }
  }

  // Final summary
  header("Summary");
  console.log(colorize("✓ Sync complete!", "green"));
  console.log("");
  console.log(colorize("Next steps:", "yellow"));
  console.log("  1. Review changes in:", TARGET);
  if (diffOutput) {
    console.log("  2. Complete the changelog template in:", CHANGELOG_PATH);
    console.log("  3. Update .cursor/rules/cs2-dev.mdc if needed");
    console.log("  4. Test example scripts in CS2");
  } else {
    console.log("  2. Update .cursor/rules/cs2-dev.mdc if needed");
    console.log("  3. Test example scripts in CS2");
  }
  console.log("");
}

main().catch((err) => {
  console.error(colorize("❌ Sync failed:", "red"), err.message);
  process.exit(1);
});
