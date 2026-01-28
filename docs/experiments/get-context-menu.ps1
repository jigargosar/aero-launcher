# Get context menu options for files/folders

Write-Host "`n=== COM-based Shell Verbs (for a folder) ===" -ForegroundColor Cyan
$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace("C:\Users\jigar\projects")
$item = $folder.ParseName("launch-bar-v2")
$item.Verbs() | ForEach-Object { $_.Name }

Write-Host "`n=== COM-based Shell Verbs (for a file) ===" -ForegroundColor Cyan
$folder2 = $shell.Namespace("C:\Users\jigar\projects\launch-bar-v2")
$item2 = $folder2.ParseName("package.json")
$item2.Verbs() | ForEach-Object { $_.Name }

Write-Host "`n=== Registry: Directory Context Menu ===" -ForegroundColor Cyan
Get-ChildItem "Registry::HKEY_CLASSES_ROOT\Directory\shell" | Select-Object -ExpandProperty PSChildName

Write-Host "`n=== Registry: All Files (*) Context Menu ===" -ForegroundColor Cyan
Get-ChildItem "Registry::HKEY_CLASSES_ROOT\*\shell" -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty PSChildName |
    Where-Object { $_ -ne "shell" -and $_ -ne "Shell" } |
    Select-Object -First 20
