$shell = New-Object -ComObject Shell.Application
$appsFolder = $shell.Namespace("shell:AppsFolder")

# Locations to search for backing files
$searchPaths = @(
    "$env:USERPROFILE\Desktop",
    "$env:PUBLIC\Desktop",
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "$env:ProgramData\Microsoft\Windows\Start Menu\Programs"
)

# Get all .lnk and .url files
$backingFiles = @{}
foreach ($path in $searchPaths) {
    Get-ChildItem $path -Recurse -Include "*.lnk","*.url" -ErrorAction SilentlyContinue | ForEach-Object {
        $backingFiles[$_.BaseName.ToLower()] = $_.FullName
    }
}

Write-Host "Found $($backingFiles.Count) potential backing files"
Write-Host ""

$withBacking = @()
$withoutBacking = @()

foreach ($item in $appsFolder.Items() | Select-Object -First 30) {
    $name = $item.Name
    $nameLower = $name.ToLower()

    # Try exact match first, then partial
    $backingFile = $backingFiles[$nameLower]
    if (-not $backingFile) {
        $backingFile = $backingFiles.GetEnumerator() |
            Where-Object { $_.Key -like "*$nameLower*" -or $nameLower -like "*$($_.Key)*" } |
            Select-Object -First 1 | ForEach-Object { $_.Value }
    }

    if ($backingFile) {
        $withBacking += @{ Name = $name; Path = $item.Path; BackingFile = $backingFile }
    } else {
        $withoutBacking += @{ Name = $name; Path = $item.Path }
    }
}

Write-Host "=== WITH Backing File ($($withBacking.Count)) ==="
$withBacking | ForEach-Object {
    Write-Host "  $($_.Name)"
    Write-Host "    Path: $($_.Path)"
    Write-Host "    File: $($_.BackingFile)"
    Write-Host ""
}

Write-Host "=== WITHOUT Backing File ($($withoutBacking.Count)) ==="
$withoutBacking | ForEach-Object {
    Write-Host "  $($_.Name)"
    Write-Host "    Path: $($_.Path)"
    Write-Host ""
}
