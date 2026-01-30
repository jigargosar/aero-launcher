$shell = New-Object -ComObject Shell.Application
$apps = $shell.Namespace("shell:AppsFolder")
$item = $apps.Items() | Where-Object { $_.Name -like "*AutoHotkey Window Spy*" } | Select-Object -First 1

Write-Host "Name: $($item.Name)"
Write-Host "Path: $($item.Path)"
Write-Host "Type: $($item.Type)"

Write-Host ""
Write-Host "=== Trying to get target ==="

# GetLink
$link = $item.GetLink
Write-Host "GetLink: $link"
if ($link) {
    Write-Host "  Link.Path: $($link.Path)"
    Write-Host "  Link.Target: $($link.Target)"
}

# ExtendedProperty variations
Write-Host "System.Link.TargetParsingPath: $($item.ExtendedProperty('System.Link.TargetParsingPath'))"
Write-Host "System.AppUserModel.ID: $($item.ExtendedProperty('System.AppUserModel.ID'))"
Write-Host "System.Tile.Arguments: $($item.ExtendedProperty('System.Tile.Arguments'))"
Write-Host "System.Link.Arguments: $($item.ExtendedProperty('System.Link.Arguments'))"

# Try invoking verbs
Write-Host ""
Write-Host "=== Verbs ==="
$item.Verbs() | ForEach-Object { Write-Host $_.Name }
