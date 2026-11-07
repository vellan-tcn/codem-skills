[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$c = New-Object System.Data.SqlClient.SqlConnection "Server=.\WINCC;Integrated Security=True"
$c.Open()
$cmd = $c.CreateCommand(); $cmd.CommandTimeout = 120

$sqls = @(
"IF OBJECT_ID('[WS-6N1R874OERUE].dbo.AMT') IS NOT NULL DROP TABLE [WS-6N1R874OERUE].dbo.AMT",
"CREATE TABLE [WS-6N1R874OERUE].dbo.AMT (DSN nvarchar(256) NOT NULL, PrimaryFile nvarchar(512) NULL, Start datetime NULL, Stop datetime NULL, Status int NULL, LastModification datetime NULL, Type int NULL)",
"INSERT INTO [WS-6N1R874OERUE].dbo.AMT (DSN, PrimaryFile, Start, Stop, Status, LastModification, Type) VALUES (N'WS-6N1R874OERUE', N'C:\SQLData\w3.mdf', '2025-12-31 18:34:00', '2026-01-06 10:57:00', 0, '2026-01-06 11:00:00', 1)"
)
foreach ($s in $sqls) { $cmd.CommandText = $s; $cmd.ExecuteNonQuery() | Out-Null }
Write-Output "AMT created + row inserted"
$c.Close()

try {
  $conn = New-Object System.Data.OleDb.OleDbConnection
  $conn.ConnectionString = "Provider=WinCCOLEDBProvider.1;Catalog=WS-6N1R874OERUE;Data Source=.\WinCC"
  $conn.Open()
  $oc = $conn.CreateCommand()
  $oc.CommandText = "TAG:R,891,'2025-12-31 18:00:00.000','2026-01-01 00:00:00.000'"
  $ad = New-Object System.Data.OleDb.OleDbDataAdapter($oc)
  $ds = New-Object System.Data.DataSet
  $ad.Fill($ds)
  $t = $ds.Tables[0]
  Write-Output ("TAG:R SUCCESS! rows=" + $t.Rows.Count)
  Write-Output ("columns: " + (($t.Columns | ForEach-Object { $_.ColumnName }) -join ", "))
  $i = 0
  foreach ($row in $t.Rows) { Write-Output ("   " + (($row.ItemArray | ForEach-Object { $_.ToString() }) -join " | ")); $i++; if ($i -ge 10) { break } }
  $conn.Close()
} catch {
  Write-Output ("STILL FAIL: " + $_.Exception.GetBaseException().Message)
}
