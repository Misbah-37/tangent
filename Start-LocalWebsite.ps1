param([ValidateRange(1,65535)][int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$candidates = @('python', 'py')
foreach ($candidate in $candidates) {
    try {
        $null = & $candidate -c 'import http.server' 2>$null
        if ($LASTEXITCODE -eq 0) { $pythonExe = $candidate; break }
    } catch { }
}
if (-not $pythonExe) { throw 'Python 3 is required. No working Python was found.' }
Write-Host "RunTangent: http://127.0.0.1:$Port/ (Ctrl+C to stop)"
& $pythonExe -m http.server $Port --bind 127.0.0.1 --directory $PSScriptRoot
exit $LASTEXITCODE
