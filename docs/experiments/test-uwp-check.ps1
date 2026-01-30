$shell = New-Object -ComObject Shell.Application
$appsFolder = $shell.Namespace('shell:AppsFolder')

# Find items with '!' in Path (our original UWP detection)
$uwpByPath = $appsFolder.Items() | Where-Object { $_.Path -match '!' } | Select-Object -First 5

Write-Host "=== Items with '!' in Path ==="
foreach ($item in $uwpByPath) {
    Write-Host ""
    Write-Host "Name: $($item.Name)"
    Write-Host "Path: $($item.Path)"

    # Try ExtendedProperty
    $appId = $item.ExtendedProperty("AppUserModelID")
    Write-Host "ExtendedProperty(AppUserModelID): $appId"

    # Try other methods
    $appId2 = $item.ExtendedProperty("System.AppUserModel.ID")
    Write-Host "ExtendedProperty(System.AppUserModel.ID): $appId2"
}
