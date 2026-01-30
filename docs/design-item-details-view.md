# Item Details View Design

## 1. Overview

Info trigger (Ctrl+I) displays item metadata as a navigable list. Goal: expose the same information available in Windows Properties dialog (General + Details tabs).

Each property becomes a list item. Nested structures (dependencies, extensions) can be browsed into via pushList.

---

## 2. Data Sources by Item Type

### 2.1 Universal (Any File/Folder)

**Shell.Application GetDetailsOf** - 300+ properties, same as Windows Explorer Properties dialog.

```powershell
$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace("C:\Path\To\Folder")

foreach ($file in $folder.Items()) {
    $props = @{}
    for ($i = 0; $i -lt 400; $i++) {
        $key = $folder.GetDetailsOf($folder.Items, $i)
        if (![string]::IsNullOrWhiteSpace($key)) {
            $value = $folder.GetDetailsOf($file, $i)
            if (![string]::IsNullOrWhiteSpace($value)) {
                $props[$key] = $value
            }
        }
    }
    # $props contains all available metadata
}
```

**Node.js fs.stat** - Basic file stats.

```typescript
import { stat } from 'fs/promises'

const stats = await stat(filePath)
// stats.size, stats.mtime, stats.birthtime, stats.mode
```

### 2.2 UWP Apps (shell:AppsFolder with `!` in path)

UWP apps have paths like `Microsoft.WindowsCalculator_8wekyb3d8bbwe!App`.

**AppxManifest.xml via fast-xml-parser** - Rich metadata from package manifest.

```typescript
import { XMLParser } from 'fast-xml-parser'
import { readFile } from 'fs/promises'
import { execSync } from 'child_process'

// Get install location
const installLocation = execSync(
    `powershell -NoProfile -Command "(Get-AppxPackage -Name Microsoft.WindowsCalculator).InstallLocation"`,
    { encoding: 'utf-8' }
).trim()

// Parse manifest
const xml = await readFile(`${installLocation}\\AppxManifest.xml`, 'utf-8')
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: ''  // Clean keys for display
})
const manifest = parser.parse(xml)

// manifest.Package contains:
// - Identity (Name, Publisher, Version, ProcessorArchitecture)
// - Properties (DisplayName, PublisherDisplayName, Logo)
// - Applications.Application (Executable, Description, Protocols)
// - Capabilities, Dependencies, Resources
```

**Get-AppxPackage** - Backup/simpler approach.

```powershell
Get-AppxPackage -Name "Microsoft.WindowsCalculator" |
    Select-Object Name, Version, Publisher, InstallLocation, PackageFamilyName
```

### 2.3 Win32 Apps (shell:AppsFolder without `!`)

Win32 apps have paths like `Google.Antigravity` or `308046B0AF4A39CB`.

**Uninstall Registry** - Version, publisher, install location.

```powershell
Get-ItemProperty "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*",
                 "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*" -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName } |
    Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation, InstallDate
```

Match by name (fuzzy) since AppID doesn't directly map to registry key.

**Shell GetDetailsOf** - Limited for virtual shell:AppsFolder items (only Name, Tags, AppUserModelId).

### 2.4 Shortcuts (.lnk)

**Electron shell.readShortcutLink** - Target, arguments, working directory, icon.

```typescript
import { shell } from 'electron'

const shortcut = shell.readShortcutLink(lnkPath)
// shortcut.target - Target executable path
// shortcut.cwd - Working directory
// shortcut.args - Command line arguments
// shortcut.appUserModelId - App ID (for deduplication)
// shortcut.icon - Icon path
// shortcut.iconIndex - Icon index
```

**Shell GetDetailsOf** - Additional properties from shell.

### 2.5 URL Files (.url)

**Parse INI format** - Extract target URL.

```typescript
const content = await readFile(urlPath, 'utf-8')
const match = content.match(/URL=(.+)/i)
const url = match ? match[1].trim() : null
```

**fs.stat** - File dates.

### 2.6 Executables (.exe)

**PowerShell VersionInfo** - Version, company, product name.

```powershell
(Get-Item "C:\Path\To\App.exe").VersionInfo |
    Select-Object FileVersion, ProductName, CompanyName, FileDescription
```

**Shell GetDetailsOf** - Full properties (same as Properties > Details tab).

```
Product version, Company, File description, Size, Date modified/created,
Language, Copyright, etc.
```

### 2.7 Media/Documents

**Shell GetDetailsOf** - Rich metadata varies by file type:

- **Images**: Dimensions, bit depth, camera info, GPS
- **Audio**: Duration, bitrate, artist, album, genre
- **Video**: Duration, frame rate, dimensions, codec
- **Documents**: Author, title, pages, word count

---

## 3. Extraction Approach

**Principle**: Extract ALL properties, apply blacklist to remove noise.

### Blacklist (truly internal/useless)

| Pattern | Reason |
|---------|--------|
| `xmlns` | XML namespace declarations |
| `build:Metadata` | Compiler flags, build tools |
| `InProcessServer` | COM class registration |
| `ActivatableClass` | COM activation internals |
| `ThreadingModel` | Implementation detail |
| `mp:PhoneIdentity` | Legacy Windows Phone store GUIDs |

### Flatten Helper

```typescript
function flatten(obj: unknown, prefix = '', result: Record<string, string> = {}) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
            flatten(value, prefix ? `${prefix}.${key}` : key, result)
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
            flatten(item, `${prefix}[${idx}]`, result)
        })
    } else if (obj !== null && obj !== undefined && obj !== '') {
        result[prefix] = String(obj)
    }
    return result
}
```

### Apply Blacklist

```typescript
const BLACKLIST = ['xmlns', 'build:Metadata', 'InProcessServer', 'ActivatableClass', 'ThreadingModel', 'mp:PhoneIdentity']

function applyBlacklist(props: Record<string, string>) {
    return Object.fromEntries(
        Object.entries(props).filter(([key]) =>
            !BLACKLIST.some(bl => key.includes(bl))
        )
    )
}
```

---

## 4. Data Structure

```typescript
type Item = {
    id: string
    name: string
    // ...
    metadata: {
        appId: string           // For execution
        info: Record<string, unknown>  // For display
    }
}
```

- Flat `info` for simple key-value display
- Nested objects in `info` can trigger pushList for browsing

---

## 5. Display

### Basic: Key-Value List

```typescript
const infoItems = Object.entries(item.metadata.info).map(([key, value]) => ({
    id: `${item.id}-info-${key}`,
    name: `${key}: ${value}`,
    icon: Icons.info,
    moduleId: item.moduleId,
    metadata: { kind: 'info', key, value },
    triggers: ['execute'],  // Copy to clipboard
}))
return { type: 'pushList', items: infoItems }
```

### Nested: Browse Into

For nested objects (Dependencies, Extensions), return items that themselves have `browse` trigger to drill down.

### Assets: Resolve Paths

Logo/icon paths like `Assets\Logo.png` are relative to InstallLocation. Could resolve and display actual images.

---

## 6. Dependencies

| Package | Purpose |
|---------|---------|
| `fast-xml-parser` | Parse AppxManifest.xml |
| PowerShell | Registry, shell queries, version info |
| Electron `shell` | readShortcutLink for .lnk files |
| Node.js `fs` | File stats, read files |

---

## 7. Future Considerations

- **Caching**: Info extraction can be slow; cache in `metadata.info` during indexing
- **Lazy loading**: Extract info on-demand (when Ctrl+I pressed) vs upfront
- **Image display**: Resolve asset paths to actual icons/logos
- **Actions on info items**: Copy, open location, search, etc.
