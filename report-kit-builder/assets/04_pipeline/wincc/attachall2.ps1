[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dst = "C:\SQLData\seg"

$c = New-Object System.Data.SqlClient.SqlConnection("Server=.\WINCC;Integrated Security=True")
$c.Open()
$cmd = $c.CreateCommand(); $cmd.CommandTimeout = 600

# 清空 AMT 重新注册
$cmd.CommandText = "DELETE FROM [WS-6N1R874OERUE].dbo.AMT"
$cmd.ExecuteNonQuery() | Out-Null

$lines = [System.IO.File]::ReadAllLines("$dst\manifest.txt")
$ok = 0; $fail = 0
foreach ($line in $lines) {
  if (-not $line.Trim()) { continue }
  $p = $line.Split("|")
  $dbname = $p[0]
  $s = [datetime]::ParseExact($p[1], "yyyyMMddHHmm", $null)
  $e = [datetime]::ParseExact($p[2], "yyyyMMddHHmm", $null)
  $mdf = "$dst\$dbname.mdf"
  $ldf = "$dst\$dbname.ldf"

  icacls $mdf /grant "NT Service\MSSQL`$WINCC:(F)" | Out-Null
  if (Test-Path $ldf) { icacls $ldf /grant "NT Service\MSSQL`$WINCC:(F)" | Out-Null }

  $cmd.CommandText = "IF DB_ID('$dbname') IS NOT NULL DROP DATABASE [$dbname]"
  try { $cmd.ExecuteNonQuery() | Out-Null } catch {}

  $attachSql = "CREATE DATABASE [$dbname] ON (FILENAME = '$mdf')"
  if (Test-Path $ldf) { $attachSql += ", (FILENAME = '$ldf')" }
  $attachSql += " FOR ATTACH"
  try {
    $cmd.CommandText = $attachSql
    $cmd.ExecuteNonQuery() | Out-Null
    $st = $s.ToString("yyyy-MM-dd HH:mm:ss")
    $et = $e.ToString("yyyy-MM-dd HH:mm:ss")
    $cmd.CommandText = "INSERT INTO [WS-6N1R874OERUE].dbo.AMT (DSN, PrimaryFile, Start, Stop, Status, LastModification, Type, dbStart, dbStop) VALUES (N'$dbname', N'$mdf', '$st', '$et', 0, '$et', 2, '$st', '$et')"
    $cmd.ExecuteNonQuery() | Out-Null
    $ok++
    Write-Output "OK $dbname $st ~ $et"
  } catch {
    $fail++
    Write-Output "FAIL $dbname : $($_.Exception.GetBaseException().Message)"
  }
}
Write-Output "=== attached OK=$ok FAIL=$fail ==="
$cmd.CommandText = "SELECT COUNT(1) FROM [WS-6N1R874OERUE].dbo.AMT"
Write-Output ("AMT rows: " + $cmd.ExecuteScalar())
$c.Close()
