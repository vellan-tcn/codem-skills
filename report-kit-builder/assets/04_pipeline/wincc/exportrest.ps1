[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = 'C:\SQLData\export'
$conn = New-Object System.Data.OleDb.OleDbConnection
$conn.ConnectionString = 'Provider=WinCCOLEDBProvider.1;Catalog=WS-6N1R874OERUE;Data Source=.\WinCC'
$conn.Open()
$oc = $conn.CreateCommand()
$oc.CommandTimeout = 600

$vids = @(930, 931, 932, 933, 934, 935, 936, 983, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037)

$months = New-Object System.Collections.Generic.List[string]
$y = 2025; $m = 9
while ($true) {
  $months.Add(('{0:D4}-{1:D2}' -f $y, $m))
  if ($y -eq 2026 -and $m -eq 9) { break }
  $m++; if ($m -gt 12) { $m = 1; $y++ }
}

foreach ($vid in $vids) {
  $sw = New-Object System.IO.StreamWriter(($dir + '\v' + $vid + '.csv'), $false, [System.Text.Encoding]::UTF8)
  $sw.WriteLine('timestamp,value,quality')
  $total = 0
  foreach ($mm in $months) {
    $s = $mm + '-01 00:00:00.000'
    $ny = [int]$mm.Substring(0,4); $nm = [int]$mm.Substring(5,2)
    $nm++
    if ($nm -gt 12) { $nm = 1; $ny++ }
    $e = ('{0:D4}-{1:D2}-01 00:00:00.000' -f $ny, $nm)
    $oc.CommandText = 'TAG:R,' + $vid + ',''' + $s + ''',''' + $e + ''''
    $ad = New-Object System.Data.OleDb.OleDbDataAdapter($oc)
    $ds = New-Object System.Data.DataSet
    try {
      [void]$ad.Fill($ds)
      $tb = $ds.Tables[0]
      $cnt = 0
      foreach ($row in $tb.Rows) {
        $ts = $row[1]
        if ($ts -ne [DBNull]::Value) {
          $sw.WriteLine($ts.ToString('yyyy-MM-dd HH:mm:ss') + ',' + $row[2].ToString([System.Globalization.CultureInfo]::InvariantCulture) + ',' + $row[3])
          $cnt++
        }
      }
      $total += $cnt
    } catch { Write-Output ('v' + $vid + ' ' + $mm + ' ERR: ' + $_.Exception.GetBaseException().Message) }
  }
  $sw.Close()
  Write-Output ('v' + $vid + ' total rows: ' + $total)
}
$conn.Close()
Write-Output '=== export rest done ==='
