set -e
cd /opt
mkdir -p /opt/aikanpan-web-new
find /opt/aikanpan-web-new -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xf /tmp/aikanpan-deploy.tar -C /opt/aikanpan-web-new

backup="/opt/dsa-mp/backups/server.py.before-cn-earnings-$(date +%Y%m%d-%H%M%S)"
cp /opt/dsa-mp/server.py "$backup"
cp /tmp/server_new.py /opt/dsa-mp/server.py
/opt/dsa-mp/.venv/bin/python -m py_compile /opt/dsa-mp/server.py

systemctl restart dsa.service
pm2 restart aikanpan-web --update-env >/dev/null
sleep 3

printf 'frontend health: '
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
printf 'backend health: '
curl -sS -w '\n' http://127.0.0.1:8000/api/v1/health
printf 'cn earnings: '
curl -sS -w '\n' http://127.0.0.1:8000/api/v1/cn/earnings-calendar | head -c 500
printf '\nbackup: %s\n' "$backup"
