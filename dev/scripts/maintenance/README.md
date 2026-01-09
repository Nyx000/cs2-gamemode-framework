# Maintenance Scripts

## sync-type-definitions.mjs

Cross-platform script to automatically sync CS2 type definitions from your Counter-Strike 2 installation.

### Overview

This script:

- Automatically detects your CS2 installation on all platforms
- Falls back to the `CS2_INSTALL_PATH` environment variable if automatic detection fails
- Compares files and generates a diff when changes are detected
- Updates the API_CHANGELOG.md with a template for documenting changes
- Works across Windows, WSL2, macOS, and Linux

### Supported Platforms

- **Windows** - Searches standard Steam installation paths
- **WSL2** - Detects Windows-based Steam installations via `/mnt/` paths
- **macOS** - Searches Library and Applications directories
- **Linux** - Searches standard Steam directories

### Usage

#### Basic Usage

```bash
npm run sync-types
```

The script will:

1. Detect your platform
2. Search for CS2 installation automatically
3. Sync type definitions if found
4. Report any API changes

#### Custom Installation Path

If the script can't find your CS2 installation automatically, set the `CS2_INSTALL_PATH` environment variable:

**WSL2/Linux:**

```bash
export CS2_INSTALL_PATH="/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive"
npm run sync-types
```

**Windows (PowerShell):**

```powershell
$env:CS2_INSTALL_PATH="C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive"
npm run sync-types
```

**Windows (CMD):**

```cmd
set CS2_INSTALL_PATH=C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive
npm run sync-types
```

**macOS/Linux (permanent):**

```bash
# Add to ~/.bashrc or ~/.zprofile
export CS2_INSTALL_PATH="~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive"

# Then:
source ~/.bashrc  # or ~/.zprofile
npm run sync-types
```

### Automatic Search Paths

The script searches these paths by default:

**Windows:**

- `C:\Program Files (x86)\Steam\steamapps\common\Counter-Strike Global Offensive`
- `C:\Program Files\Steam\steamapps\common\Counter-Strike Global Offensive`
- `D:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive`
- `E:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive`
- `F:\SteamLibrary\steamapps\common\Counter-Strike Global Offensive`

**WSL2:**

- `/mnt/c/Program Files (x86)/Steam/steamapps/common/Counter-Strike Global Offensive`
- `/mnt/c/Program Files/Steam/steamapps/common/Counter-Strike Global Offensive`
- `/mnt/d/SteamLibrary/steamapps/common/Counter-Strike Global Offensive`
- `/mnt/e/SteamLibrary/steamapps/common/Counter-Strike Global Offensive`
- `/mnt/f/SteamLibrary/steamapps/common/Counter-Strike Global Offensive`

**macOS:**

- `~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive`
- `/Applications/Steam.app/Contents/MacOS/steamapps/common/Counter-Strike Global Offensive`

**Linux:**

- `~/.steam/steam/steamapps/common/Counter-Strike Global Offensive`
- `~/.local/share/Steam/steamapps/common/Counter-Strike Global Offensive`
- `~/snap/steam/common/.steam/steam/steamapps/common/Counter-Strike Global Offensive`

### Output

When changes are detected, the script:

1. Generates a diff file with timestamp: `type-diff-YYYY-MM-DD.txt`
2. Creates a backup of the changelog: `API_CHANGELOG.md.backup-YYYY-MM-DD`
3. Inserts a template in `API_CHANGELOG.md` for documenting changes
4. Updates type definitions: `src/types/cs_script.d.ts`

### Environment Variables

- `CS2_INSTALL_PATH` - Override automatic CS2 path detection
- `npm_package_json_dir` - Set by npm, used to determine project root

### Troubleshooting

**"CS2 installation not found"**

- Ensure CS2 is installed at one of the search paths
- Or set `CS2_INSTALL_PATH` environment variable with the correct path
- Verify the path contains `content/csgo/maps/editor/zoo/scripts/point_script.d.ts`

**"CS2_INSTALL_PATH environment variable is set but invalid"**

- Verify the path exists and points to the root CS2 directory
- Check that the directory contains the expected subdirectories
- Use quotes if the path contains spaces

**"Permission denied" errors**

- On macOS/Linux, ensure you have read permissions on the CS2 installation
- The script will handle file permissions automatically for the target file
