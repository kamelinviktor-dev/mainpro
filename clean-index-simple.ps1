# Restore from backup
Copy-Item index_backup.html index.html -Force

# Read file content
$content = Get-Content index.html

# Find the last </body> tag
$output = @()
foreach ($line in $content) {
    $output += $line
    if ($line -match "</body>") {
        break
    }
}

# Write output and append </html>
$output | Set-Content index.html
Add-Content index.html "</html>"

Write-Host "✅ File cleaned successfully"

