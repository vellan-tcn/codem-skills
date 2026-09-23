[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$mdf = "C:\SQLData\w2.mdf"
$ldf = "C:\SQLData\w2.ldf"
$c = New-Object System.Data.SqlClient.SqlConnection "Server=.\WINCC;Integrated Security=True"
$c.Open()
$cmd = $c.CreateCommand(); $cmd.CommandTimeout = 300
foreach ($db in @('TLG_S_TEST','WS_6N1R874OERUE')) {
  $cmd.CommandText = "IF DB_ID('$db') IS NOT NULL ALTER DATABASE [$db] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"
  try { $cmd.ExecuteNonQuery() | Out-Null } catch {}
  $cmd.CommandText = "IF DB_ID('$db') IS NOT NULL DROP DATABASE [$db]"
  try { $cmd.ExecuteNonQuery() | Out-Null } catch { Write-Output ("drop $db : " + $_.Exception.Message) }
}
# w3.mdf/w3.ldf 已从原始目录重新拷贝
icacls "C:\SQLData\w3.mdf" /grant "NT Service\MSSQL`$WINCC:(F)" | Out-Null
icacls "C:\SQLData\w3.ldf" /grant "NT Service\MSSQL`$WINCC:(F)" | Out-Null
try {
  $cmd.CommandText = "CREATE DATABASE [WS-6N1R874OERUE] ON (FILENAME = 'C:\SQLData\w3.mdf'), (FILENAME = 'C:\SQLData\w3.ldf') FOR ATTACH"
  $cmd.ExecuteNonQuery() | Out-Null
  Write-Output "attached as [WS-6N1R874OERUE]"
} catch { Write-Output ("ATTACH FAIL: " + $_.Exception.Message); $c.Close(); exit }
$c.Close()

# OLE-DB 测试，多个 Catalog 变体
foreach ($cat in @('WS-6N1R874OERUE')) {
  try {
    $conn = New-Object System.Data.OleDb.OleDbConnection
    $conn.ConnectionString = "Provider=WinCCOLEDBProvider.1;Catalog=$cat;Data Source=.\WinCC"
    $conn.Open()
    $oc = $conn.CreateCommand()
    $oc.CommandText = "TAG:R,891,'2025-12-31 18:00:00.000','2026-01-01 00:00:00.000'"
    $ad = New-Object System.Data.OleDb.OleDbDataAdapter($oc)
    $ds = New-Object System.Data.DataSet
    $ad.Fill($ds)
    $t = $ds.Tables[0]
    Write-Output ("CATALOG=$cat TAG:R rows: " + $t.Rows.Count)
    Write-Output ("columns: " + (($t.Columns | ForEach-Object { $_.ColumnName }) -join ", "))
    $i = 0
    foreach ($row in $t.Rows) { Write-Output (($row.ItemArray | ForEach-Object { $_.ToString() }) -join " | "); $i++; if ($i -ge 10) { break } }
    $conn.Close()
  } catch {
    Write-Output ("CATALOG=$cat FAIL: " + $_.Exception.Message)
  }
}
