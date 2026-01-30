$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace("C:\Program Files\Git")

# Get just 5 apps to test
$items = $folder.Items() | Select-Object -First 5

$results = @()

foreach ($item in $items) {
    $props = @{}
    for ($i = 0; $i -lt 400; $i++) {
        $key = $folder.GetDetailsOf($folder.Items, $i)
        if (![string]::IsNullOrWhiteSpace($key)) {
            $value = $folder.GetDetailsOf($item, $i)
            if (![string]::IsNullOrWhiteSpace($value)) {
                $props[$key] = $value
            }
        }
    }
    $results += [PSCustomObject]$props
}

$results | ConvertTo-Json -Depth 3
