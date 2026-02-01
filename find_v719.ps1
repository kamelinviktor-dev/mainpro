$historyPath = Get-ChildItem -Path ".\\.cursor\\history" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -eq ".html" -or $_.Extension -eq ".htm" }

$matches = @()
foreach ($file in $historyPath) {
    try {
        $text = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        if ($text -match "MainPro v71\.9" -or $text -match "Add Task v74") {
            $matches += [PSCustomObject]@{
                Path = $file.FullName
                Modified = $file.LastWriteTime
                SizeKB = [math]::Round($file.Length / 1KB, 1)
            }
        }
    } catch {}
}

if ($matches.Count -eq 0) {
    Write-Host "Nothing found in .cursor\\history" -ForegroundColor Red
} else {
    Write-Host "Found MainPro versions:" -ForegroundColor Green
    $matches | Sort-Object Modified -Descending | Select-Object -First 5 | Format-Table -AutoSize
    Write-Host "(Newest at top)"
}
