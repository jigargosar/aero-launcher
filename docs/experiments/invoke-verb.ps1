# Test invoking shell verbs

$targetPath = "C:\Users\jigar\projects\launch-bar-v2"

$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace((Split-Path $targetPath))
$item = $folder.ParseName((Split-Path $targetPath -Leaf))

Write-Host "=== Available Verbs ===" -ForegroundColor Cyan
$verbs = $item.Verbs()
for ($i = 0; $i -lt $verbs.Count; $i++) {
    $verb = $verbs.Item($i)
    if ($verb.Name) {
        Write-Host "$i : $($verb.Name)"
    }
}

# To invoke a verb by name:
# $item.InvokeVerb("open")
# $item.InvokeVerb("properties")

# Or invoke via the verb object:
# $verbs.Item(0).DoIt()

Write-Host "`n=== Testing: Open Properties ===" -ForegroundColor Yellow
# Uncomment to test:
# $item.InvokeVerb("properties")
