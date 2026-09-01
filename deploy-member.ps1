$ErrorActionPreference = "Stop"
Set-Location "D:\Codex\projects\aikanpan-web"

Write-Output "=== 1. sync static into standalone ==="
robocopy ".next\static" ".next\standalone\.next\static" /MIR /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy static failed: $LASTEXITCODE" }
robocopy "public" ".next\standalone\public" /MIR /NFL /NDL /NJH /NJS | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy public failed: $LASTEXITCODE" }

Write-Output "=== 2. package ==="
tar -czf aikanpan-standalone-member.tar.gz -C ".next\standalone" .
if ($LASTEXITCODE -ne 0) { throw "tar failed" }

Write-Output "=== 3. upload ==="
scp aikanpan-standalone-member.tar.gz root@47.108.163.124:/tmp/
if ($LASTEXITCODE -ne 0) { throw "scp failed" }

Write-Output "=== 4. remote replace + restart ==="
ssh root@47.108.163.124 "cd /opt/aikanpan-web-new && rm -rf /tmp/aikanpan-next-backup-member && mkdir -p /tmp/aikanpan-next-backup-member && cp -a .next public /tmp/aikanpan-next-backup-member/ && tar -xzf /tmp/aikanpan-standalone-member.tar.gz -C /opt/aikanpan-web-new && pm2 restart aikanpan-web && sleep 3 && curl -s -o /dev/null -w 'home %{http_code}\n' http://127.0.0.1:3000/ && curl -s http://127.0.0.1:3000/upgrade/ -o /dev/null -w 'upgrade %{http_code}\n'"
