set -e
cd /opt
mkdir -p /opt/aikanpan-web-new
find /opt/aikanpan-web-new -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -xf /tmp/aikanpan-deploy.tar -C /opt/aikanpan-web-new
pm2 restart aikanpan-web --update-env >/dev/null
sleep 2
printf 'frontend health: '
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
