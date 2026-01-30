$shell = New-Object -ComObject Shell.Application
$appsFolder = $shell.Namespace("shell:AppsFolder")

$results = foreach ($item in $appsFolder.Items()) {
    $name = $item.Name
    $path = $item.Path

    # Case 1: Path is file path
    if ($path -match "^[A-Z]:\\") {
        @{
            Category = "FilePath"
            Name = $name
            TargetPath = $path
        }
    }
    # Case 2: UWP (has !)
    elseif ($path -match "!") {
        $pkgFamily = $path.Split("!")[0]
        $pkg = Get-AppxPackage | Where-Object { $_.PackageFamilyName -eq $pkgFamily } | Select-Object -First 1
        if ($pkg) {
            @{
                Category = "UWP"
                Name = $name
                ManifestPath = (Join-Path $pkg.InstallLocation "AppxManifest.xml")
            }
        } else {
            @{
                Category = "Unknown"
                Name = $name
                Path = $path
            }
        }
    }
    # Case 3: Try ExtendedProperty for target
    else {
        $targetPath = $item.ExtendedProperty("System.Link.TargetParsingPath")
        if ($targetPath) {
            @{
                Category = "HasTarget"
                Name = $name
                TargetPath = $targetPath
            }
        } else {
            @{
                Category = "Unknown"
                Name = $name
                Path = $path
            }
        }
    }
}

$results | ConvertTo-Json -Depth 3
