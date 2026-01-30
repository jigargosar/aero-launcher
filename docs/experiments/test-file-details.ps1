$shell = New-Object -ComObject Shell.Application

# Test with a known exe
$filePath = "C:\Program Files\AutoHotkey\UX\AutoHotkeyUX.exe"

$folder = $shell.Namespace((Split-Path $filePath))
$item = $folder.ParseName((Split-Path $filePath -Leaf))

Write-Host "=== All populated properties for: $filePath ==="
Write-Host ""

$count = 0
for ($i = 0; $i -lt 320; $i++) {
    $name = $folder.GetDetailsOf($folder.Items, $i)
    $value = $folder.GetDetailsOf($item, $i)
    if ($name -and $value) {
        Write-Host "${i}: $name = $value"
        $count++
    }
}

Write-Host ""
Write-Host "Total populated: $count"
