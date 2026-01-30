$shell = New-Object -ComObject Shell.Application
$apps = $shell.Namespace('shell:AppsFolder').Items()
$apps | ForEach-Object { $_.Name } | Sort-Object
