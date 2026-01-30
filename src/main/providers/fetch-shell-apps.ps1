$shell = New-Object -ComObject Shell.Application
$appsFolder = $shell.Namespace("shell:AppsFolder")

$results = foreach ($item in $appsFolder.Items()) {
    $name = $item.Name
    $path = $item.Path
    $category = "Unknown"

    if ($path -match "^[A-Z]:\\") {
        $category = "FilePath"
    }
    elseif ($path -match "!") {
        $category = "UWP"
    }
    else {
        $target = $item.ExtendedProperty("System.Link.TargetParsingPath")
        if ($target) { $category = "HasTarget" }
    }

    @{ Name = $name; Path = $path; Category = $category }
}

$results | ConvertTo-Json -Compress
