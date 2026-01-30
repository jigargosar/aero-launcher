param(
    [string]$AppPath,
    [string]$Category,
    [string]$Whitelist
)

$shell = New-Object -ComObject Shell.Application
$whitelistArray = $Whitelist -split '\|'

function Get-FileDetails($filePath) {
    $info = @{}
    if (-not $filePath -or -not (Test-Path $filePath -ErrorAction SilentlyContinue)) { return $info }
    $folder = $shell.Namespace((Split-Path $filePath))
    $item = $folder.ParseName((Split-Path $filePath -Leaf))
    if ($item) {
        for ($i = 0; $i -lt 320; $i++) {
            $name = $folder.GetDetailsOf($folder.Items, $i)
            $value = $folder.GetDetailsOf($item, $i)
            if ($name -and $value -and ($whitelistArray -contains $name)) {
                $info[$name] = $value
            }
        }
    }
    return $info
}

$info = @{}

if ($Category -eq "FilePath") {
    $info = Get-FileDetails $AppPath
}
elseif ($Category -eq "UWP") {
    $pkgFamily = $AppPath.Split("!")[0]
    $pkg = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq $pkgFamily } | Select-Object -First 1
    if ($pkg) {
        $info["InstallLocation"] = $pkg.InstallLocation
        $info["ManifestPath"] = Join-Path $pkg.InstallLocation "AppxManifest.xml"
    }
}
elseif ($Category -eq "HasTarget") {
    $appsFolder = $shell.Namespace("shell:AppsFolder")
    $item = $appsFolder.Items() | Where-Object { $_.Path -eq $AppPath } | Select-Object -First 1
    if ($item) {
        $targetPath = $item.ExtendedProperty("System.Link.TargetParsingPath")
        $arguments = $item.ExtendedProperty("System.Link.Arguments")
        if ($targetPath) {
            $info = Get-FileDetails $targetPath
            if ($arguments) { $info["Arguments"] = $arguments }
        }
    }
}

$info | ConvertTo-Json -Compress
