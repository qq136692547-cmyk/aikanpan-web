from pathlib import Path

path = Path("/etc/caddy/Caddyfile")
backup = Path("/etc/caddy/Caddyfile.before-tradingview-csp-20260902")
text = path.read_text()
if not backup.exists():
    backup.write_text(text)

old = "Content-Security-Policy \"default-src 'self'; img-src"
new = "Content-Security-Policy \"default-src 'self'; frame-src 'self' https://www.tradingview-widget.com https://s.tradingview.com; img-src"
if old not in text:
    raise SystemExit("Expected CSP text not found")
path.write_text(text.replace(old, new, 1))
print(backup)
