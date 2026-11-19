#!/usr/bin/env python3
"""Optional per-user installation. Does not require root or network access."""
from pathlib import Path
import os
import shlex
import shutil
source = Path(__file__).resolve().parent
target = Path.home() / '.local' / 'share' / 'aiot-home-redos'
if source == target:
    raise SystemExit('Приложение уже находится в каталоге установки.')
if os.name != 'posix':
    raise SystemExit('Установка ярлыка предназначена для Linux. Используйте python launcher.py.')
target.mkdir(parents=True, exist_ok=True)
(target / 'web').mkdir(exist_ok=True)
for item in (source / 'web').iterdir():
    if item.is_file():
        shutil.copy2(str(item), str(target / 'web' / item.name))
for name in ('launcher.py', 'start.sh'):
    shutil.copy2(str(source / name), str(target / name))
(target / 'start.sh').chmod(0o755)
bin_dir = Path.home() / '.local' / 'bin'
bin_dir.mkdir(parents=True, exist_ok=True)
wrapper = bin_dir / 'aiot-home-redos'
wrapper.write_text('#!/bin/sh\nexec ' + shlex.quote(str(target / 'start.sh')) + ' "$@"\n', encoding='utf-8')
wrapper.chmod(0o755)
def desktop_quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace(chr(96), '\\' + chr(96)).replace('$', '\\$').replace('%', '%%') + '"'
applications = Path.home() / '.local' / 'share' / 'applications'
applications.mkdir(parents=True, exist_ok=True)
(applications / 'aiot-home-redos.desktop').write_text('[Desktop Entry]\nType=Application\nName=Умный дом для всех\nComment=Учебная AIoT модель для РЕД ОС\nExec=' + desktop_quote(wrapper) + '\nIcon=' + str(target / 'web' / 'icon.svg') + '\nTerminal=true\nCategories=Education;Science;\n', encoding='utf-8')
print('Установлено: ' + str(target))
print('Запуск: ' + str(wrapper) + ' или через меню приложений. Остановка: Ctrl+C в окне терминала.')
