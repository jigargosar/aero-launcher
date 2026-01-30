$shell = New-Object -ComObject Shell.Application
$appsFolder = $shell.Namespace('shell:AppsFolder')

function Get-AppDetails($item) {
    $props = @{}

    # Case 1: Win32Exe (real .exe path directly in Path, or via System.Link.TargetParsingPath)
    $exePath = $null
    $arguments = $null

    if ($item.Path -and (Test-Path $item.Path -ErrorAction SilentlyContinue) -and $item.Path.ToLower().EndsWith(".exe")) {
        $exePath = $item.Path
    } else {
        # Try ExtendedProperty for advertised shortcuts
        $targetPath = $item.ExtendedProperty('System.Link.TargetParsingPath')
        if ($targetPath -and (Test-Path $targetPath -ErrorAction SilentlyContinue)) {
            $exePath = $targetPath
            $arguments = $item.ExtendedProperty('System.Link.Arguments')
        }
    }

    if ($exePath) {
        $file = Get-Item $exePath
        $props["Shell:Name"] = $item.Name
        $props["File:Path"] = $exePath
        if ($arguments) { $props["File:Arguments"] = $arguments }
        if ($file.VersionInfo) {
            $props["File:Version"]     = $file.VersionInfo.FileVersion
            $props["File:Publisher"]   = $file.VersionInfo.CompanyName
            $props["File:Description"] = $file.VersionInfo.FileDescription
        }
        return @{ Type = "Win32Exe"; Properties = $props }
    }

    # Case 2: UWP/MSIX (AppUserModelID with '!')
    $appId = $item.Path
    if ($appId -and $appId.Contains("!")) {
        $pkgFamily = $appId.Split("!")[0]
        $pkg = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq $pkgFamily } | Select-Object -First 1
        if ($pkg) {
            $manifestPath = Join-Path $pkg.InstallLocation "AppxManifest.xml"
            if (Test-Path $manifestPath) {
                [xml]$manifest = Get-Content $manifestPath
                $props["Shell:Name"] = $item.Name
                $props["Shell:AppUserModelID"] = $appId
                $props["Appx:PackageFamily"] = $pkg.PackageFamilyName
                $props["Appx:Version"] = $pkg.Version.ToString()
                $props["Manifest:PublisherDisplayName"] = $manifest.Package.Properties.PublisherDisplayName
                $props["Manifest:DisplayName"] = $manifest.Package.Properties.DisplayName
            }
            return @{ Type = "UWP"; Properties = $props }
        }
    }

    # Case 3: Win32AdvertisedRegistry
    $regKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\$($item.Name).exe"
    if (Test-Path $regKey) {
        $reg = Get-ItemProperty $regKey
        $props["Shell:Name"] = $item.Name
        if ($reg.'(default)') { $props["Registry:Path"] = $reg.'(default)' }
        if ($reg.Version)     { $props["Registry:Version"] = $reg.Version }
        if ($reg.Publisher)   { $props["Registry:Publisher"] = $reg.Publisher }
        if ($reg.DisplayName) { $props["Registry:DisplayName"] = $reg.DisplayName }
        return @{ Type = "Win32AdvertisedRegistry"; Properties = $props }
    }

    # Case 4: Unknown fallback
    $props["Shell:Name"] = $item.Name
    if ($item.Path) { $props["Shell:Path"] = $item.Path }
    if ($appId)     { $props["Shell:AppUserModelID"] = $appId }
    return @{ Type = "Unknown"; Properties = $props }
}

# Enumerate all apps
$results = foreach ($item in $appsFolder.Items()) {
    Get-AppDetails $item
}

# Output concise JSON
$results | ConvertTo-Json -Depth 3
