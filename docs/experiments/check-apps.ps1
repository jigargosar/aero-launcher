$shell = New-Object -ComObject Shell.Application
$apps = $shell.Namespace('shell:AppsFolder').Items()
$keywords = @('display', 'sound', 'bluetooth', 'wifi', 'personalization', 'color', 'notification', 'default app', 'power', 'storage')
foreach ($kw in $keywords) {
    $found = $apps | Where-Object { $_.Name -like "*$kw*" } | Select-Object -First 1
    if ($found) { "$kw -> $($found.Name)" }
    else { "$kw -> NOT FOUND" }
}
