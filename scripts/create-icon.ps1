Add-Type -AssemblyName System.Drawing
$bitmap = New-Object System.Drawing.Bitmap 256, 256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(12, 13, 14))
$gold = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(217, 119, 6)), 8
$white = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(243, 244, 246)), 6
$left = [System.Drawing.Point[]]@([System.Drawing.Point]::new(36,61),[System.Drawing.Point]::new(107,61),[System.Drawing.Point]::new(134,84),[System.Drawing.Point]::new(134,205),[System.Drawing.Point]::new(108,180),[System.Drawing.Point]::new(36,180))
$right = [System.Drawing.Point[]]@([System.Drawing.Point]::new(220,61),[System.Drawing.Point]::new(149,61),[System.Drawing.Point]::new(122,84),[System.Drawing.Point]::new(122,205),[System.Drawing.Point]::new(148,180),[System.Drawing.Point]::new(220,180))
$graphics.DrawPolygon($gold, $left)
$graphics.DrawPolygon($gold, $right)
$graphics.DrawLine($white, 128, 84, 128, 205)
foreach ($y in @(91,113,135)) { $graphics.DrawLine($white, 55, $y, 98, $y); $graphics.DrawLine($white, 158, $y, 201, $y) }
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $PSScriptRoot '..\assets\studio-editorial.ico'))
$icon.Save($stream)
$stream.Dispose(); $icon.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
