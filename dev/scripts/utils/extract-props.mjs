#!/usr/bin/env bun
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { colorize } from "./colors.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VPK_PATH =
  "/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/pak01_dir.vpk";
const OUTPUT_PATH = join(__dirname, "../docs/PROPS_REFERENCE_ALL.md");

function readVpkDirectory(buffer) {
  const props = new Set();

  try {
    let pos = 0;

    // Read VPK header
    const signature = buffer.readUInt32LE(pos);
    pos += 4;
    if (signature !== 0x55aa1234) {
      console.error(colorize(`Invalid VPK signature: ${signature.toString(16)}`, "red"));
      return Array.from(props);
    }

    const version = buffer.readUInt32LE(pos);
    pos += 4;
    const treeSize = buffer.readUInt32LE(pos);
    pos += 4;

    if (version === 2) {
      // VPK version 2 has additional header fields
      pos += 16; // Skip file data section size, archive MD5 section size, etc
    }

    // Read directory tree
    const treeEnd = pos + treeSize;
    const treeBuffer = buffer.slice(pos, treeEnd);

    pos = 0;

    while (pos < treeBuffer.length) {
      // Read extension (null-terminated string)
      let extEnd = treeBuffer.indexOf(0, pos);
      if (extEnd === -1 || extEnd === pos) break;

      const extension = treeBuffer.toString("utf-8", pos, extEnd);
      pos = extEnd + 1;

      // Read paths for this extension
      while (pos < treeBuffer.length) {
        // Read path (null-terminated string)
        let pathEnd = treeBuffer.indexOf(0, pos);
        if (pathEnd === -1) break;

        const path = treeBuffer.toString("utf-8", pos, pathEnd);
        pos = pathEnd + 1;

        if (!path) break; // Empty path means end of this extension

        // Read filenames for this path
        while (pos < treeBuffer.length) {
          // Read filename (null-terminated string)
          let nameEnd = treeBuffer.indexOf(0, pos);
          if (nameEnd === -1) break;

          const filename = treeBuffer.toString("utf-8", pos, nameEnd);
          pos = nameEnd + 1;

          if (!filename) break; // Empty filename means end of this path

          // Skip entry metadata (CRC, preload bytes, archive index, entry offset, entry length, terminator)
          if (pos + 18 <= treeBuffer.length) {
            pos += 18;
          } else {
            break;
          }

          // Build full path
          let fullPath = "";
          if (path && filename) {
            fullPath = `${path}/${filename}.${extension}`;
          } else if (filename) {
            fullPath = `${filename}.${extension}`;
          } else {
            continue;
          }

          // Filter for prop models
          if (
            extension === "vmdl_c" &&
            (fullPath.startsWith("models/props/") || fullPath.startsWith("models/cs_italy/"))
          ) {
            // Convert .vmdl_c to .vmdl
            const vmdlPath = fullPath.replace(".vmdl_c", ".vmdl");
            props.add(vmdlPath);
          }
        }
      }
    }
  } catch (err) {
    console.error(colorize("Error reading VPK:", "red"), err.message);
  }

  return Array.from(props).sort();
}

async function main() {
  console.log(colorize("Extracting prop models from CS2 VPK files...", "cyan"));
  console.log(colorize(`Reading: ${VPK_PATH}`, "blue"));
  console.log("");

  try {
    // Read VPK file
    const vpkBuffer = await readFile(VPK_PATH);

    // Extract props
    const props = readVpkDirectory(vpkBuffer);

    console.log(colorize(`✓ Found ${props.length} prop models`, "green"));
    console.log("");

    // Generate markdown file
    let markdown = "# CS2 Complete Prop Models List\n\n";
    markdown += `**Total Props**: ${props.length} models\n`;
    markdown += "**Source**: CS2 pak01_dir.vpk\n";
    markdown += `**Extracted**: ${new Date().toISOString().split("T")[0]}\n\n`;
    markdown += "---\n\n";
    markdown += "## All Prop Models\n\n";
    markdown += "Complete list of all CS2 prop models extracted from game files.\n\n";
    markdown += "### Usage\n\n";
    markdown += "In Hammer or cs_script, use these paths with `.vmdl` extension:\n\n";
    markdown += "```\n";
    markdown += "models/props/crates/crate_wood_small.vmdl\n";
    markdown += "```\n\n";
    markdown += "---\n\n";
    markdown += "## Prop List\n\n";
    markdown += "```\n";
    for (const prop of props) {
      markdown += `${prop}\n`;
    }
    markdown += "```\n\n";
    markdown += "---\n\n";
    markdown +=
      "For commonly used props and organized categories, see [PROPS_REFERENCE.md](PROPS_REFERENCE.md)\n";

    // Write to file
    await writeFile(OUTPUT_PATH, markdown, "utf-8");

    console.log(colorize(`✓ Saved to: ${OUTPUT_PATH}`, "green"));
    console.log("");
    console.log(colorize("First 10 props:", "cyan"));
    for (const prop of props.slice(0, 10)) {
      console.log(`  ${prop}`);
    }
    console.log("");
  } catch (err) {
    console.error(colorize("❌ Error:", "red"), err.message);
    process.exit(1);
  }
}

main();
