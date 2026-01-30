$shell = New-Object -ComObject Shell.Application
$appsFolder = $shell.Namespace('shell:AppsFolder')

# Get mix: some from start, some UWP (contain !)
$allItems = @($appsFolder.Items())
$win32 = $allItems | Where-Object { $_.Path -notmatch '!' } | Select-Object -First 5
$uwp = $allItems | Where-Object { $_.Path -match '!' } | Select-Object -First 5
$items = @($win32) + @($uwp)

# Print header
Write-Host ""
Write-Host ("+-----+================================+================================+")
Write-Host ("| #   | Name                           | Path                           |")
Write-Host ("+-----+================================+================================+")

$i = 1
foreach ($item in $items) {
    $name = if ($item.Name) { $item.Name } else { "(null)" }
    $path = if ($item.Path) { $item.Path } else { "(null)" }

    # Wrap long values - split into chunks of 30 chars
    $nameChunks = @()
    $pathChunks = @()

    $maxLen = [Math]::Max($name.Length, $path.Length)
    if ($maxLen -eq 0) { $maxLen = 1 }

    for ($j = 0; $j -lt $maxLen; $j += 30) {
        $nameChunks += if ($j -lt $name.Length) { $name.Substring($j, [Math]::Min(30, $name.Length - $j)) } else { "" }
        $pathChunks += if ($j -lt $path.Length) { $path.Substring($j, [Math]::Min(30, $path.Length - $j)) } else { "" }
    }

    for ($k = 0; $k -lt $nameChunks.Count; $k++) {
        $rowNum = if ($k -eq 0) { $i.ToString().PadLeft(3) } else { "   " }
        $n = $nameChunks[$k].PadRight(30)
        $p = $pathChunks[$k].PadRight(30)
        Write-Host ("| $rowNum | $n | $p |")
    }
    Write-Host ("+-----+--------------------------------+--------------------------------+")
    $i++
}

Write-Host ""
Write-Host "Legend: Path with '!' = UWP, Path with 'C:\' = Win32 (file), Other = Win32 (advertised)"
