#!/usr/bin/env python3
"""Read-only loopback server for the offline educational application."""
import argparse
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import sys
import threading
from urllib.parse import urlsplit, unquote
import webbrowser

WEB = Path(__file__).resolve().parent / 'web'
TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg'}
ALLOWED = {'index.html', 'style.css', 'model.js', 'app.js', 'icon.svg', 'college.jpg'}
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        name = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        if name not in ALLOWED:
            self.send_error(404)
            return
        host = self.headers.get('Host', '').split(':')[0]
        if host not in ('127.0.0.1', 'localhost'):
            self.send_error(403)
            return
        try:
            data = (WEB / name).read_bytes()
        except OSError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', TYPES[Path(name).suffix])
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.end_headers()
        self.wfile.write(data)
    def log_message(self, format, *args):
        pass
class LocalServer(HTTPServer):
    allow_reuse_address = True

def main():
    parser = argparse.ArgumentParser(description='Умный дом для всех — локальная учебная модель')
    parser.add_argument('--port', type=int, default=8765, help='Локальный порт, 0 — выбрать свободный')
    parser.add_argument('--no-browser', action='store_true', help='Не открывать браузер автоматически')
    parser.add_argument('--check', action='store_true', help='Проверить комплект файлов и завершить')
    args = parser.parse_args()
    missing = sorted(name for name in ALLOWED if not (WEB / name).is_file())
    if missing:
        parser.error('Отсутствуют файлы: ' + ', '.join(missing))
    if args.check:
        print(json.dumps({'ok': True, 'python': sys.version.split()[0], 'files': len(ALLOWED)}))
        return
    if not 0 <= args.port <= 65535:
        parser.error('Порт должен быть от 0 до 65535')
    try:
        server = LocalServer(('127.0.0.1', args.port), Handler)
    except OSError as exc:
        parser.exit(1, 'Не удалось открыть порт. Попробуйте --port 0. ' + str(exc) + '\n')
    url = 'http://127.0.0.1:{}/'.format(server.server_port)
    print('AIoT Home 1.0 — simulation only\n' + url + '\nCtrl+C — stop', flush=True)
    if not args.no_browser:
        threading.Timer(0.3, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
if __name__ == '__main__':
    main()
