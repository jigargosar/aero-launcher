$app = Get-AppxPackage -Name "Microsoft.WindowsCalculator"
if ($app) {
    $manifestPath = Join-Path $app.InstallLocation "AppxManifest.xml"
    [xml]$manifest = Get-Content $manifestPath
    $manifest | ConvertTo-Json -Depth 10
}
