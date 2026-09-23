[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
# 1) Fast 段全部改 Type=2
$c = New-Object System.Data.SqlClient.SqlConnection('Server=.\WINCC;Integrated Security=True')
$c.Open()
$cmd = $c.CreateCommand()
$cmd.CommandTimeout = 120
$cmd.CommandText = 'UPDATE [WS-6N1R874OERUE].dbo.AMT SET Type = 2 WHERE DSN LIKE ''FEG%'''
$cmd.ExecuteNonQuery() | Out-Null
Write-Output 'FEG type -> 2'

# 2) 全量导出
$dir = 'C:\SQLData\export'
New-Item -ItemType Directory -Force $dir | Out-Null
$conn = New-Object System.Data.OleDb.OleDbConnection
$conn.ConnectionString = 'Provider=WinCCOLEDBProvider.1;Catalog=WS-6N1R874OERUE;Data Source=.\WinCC'
$conn.Open()
$oc = $conn.CreateCommand()

$vids = @(891, 918, 892, 893, 890, 919, 920, 921, 922, 923, 924, 925, 926, 927, 928, 929, 930, 931, 932, 933, 934, 935, 936, 983, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037)

# 月份序列 2025-09 .. 2026-09
$months = New-Object System.Collections.Generic.List[string]
$y = 2025; $m = 9
while ($true) {
  $months.Add(('{0:D4}-{1:D2}' -f $y, $m))
  if ($y -eq 2026 -and $m -eq 9) { break }
  $m++; if ($m -gt 12) { $m = 1; $y++ }
}

$log = New-Object System.Text.StringBuilder
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
        $v = $row[2]
        $q = $row[3]
        if ($ts -ne [DBNull]::Value) {
          $sw.WriteLine($ts.ToString('yyyy-MM-dd HH:mm:ss') + ',' + $v.ToString([System.Globalization.CultureInfo]::InvariantCulture) + ',' + $q)
          $cnt++
        }
      }
      $total += $cnt
      if ($cnt -gt 0) { [void]$log.AppendLine('v' + $vid + ' ' + $mm + ' rows=' + $cnt) }
    } catch {
      [void]$log.AppendLine('v' + $vid + ' ' + $mm + ' ERR: ' + $_.Exception.GetBaseException().Message)
    }
  }
  $sw.Close()
  Write-Output ('v' + $vid + ' total rows: ' + $total)
}
[System.IO.File]::WriteAllText(($dir + '\exportlog.txt'), $log.ToString(), [System.Text.Encoding]::UTF8)
$conn.Close()
Write-Output '=== export done ==='
