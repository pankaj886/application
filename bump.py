import os, json, re, sys
from datetime import datetime

NEW_VERSION = sys.argv[1] if len(sys.argv) > 1 else "1.0.25"

def bump_json(file, key_path, val):
    if not os.path.exists(file): return
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    parts = key_path.split('.')
    d = data
    for p in parts[:-1]:
        d = d[p]
    d[parts[-1]] = val

    with open(file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

app_dir = os.path.dirname(os.path.abspath(__file__))

bump_json(os.path.join(app_dir, 'package.json'), 'version', NEW_VERSION)
bump_json(os.path.join(app_dir, 'src-tauri', 'tauri.conf.json'), 'version', NEW_VERSION)

def bump_text(file, regex_old, replacement):
    if not os.path.exists(file): return
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(regex_old, replacement, content)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

bump_text(os.path.join(app_dir, 'src-tauri', 'Cargo.toml'), r'(?m)^version = "[^"]+"', f'version = "{NEW_VERSION}"')
bump_text(os.path.join(app_dir, 'src', 'components', 'Sidebar.tsx'), r'appVersion, setAppVersion\] = useState<string>\(\'[\d\.]+\'\)', f"appVersion, setAppVersion] = useState<string>('{NEW_VERSION}')")
bump_text(os.path.join(app_dir, 'src', 'services', 'updateService.ts'), r"let currentVersion = '[\d\.]+';", f"let currentVersion = '{NEW_VERSION}';")
bump_text(os.path.join(app_dir, 'src', 'services', 'updateService.ts'), r"currentVersion = '[\d\.]+';", f"currentVersion = '{NEW_VERSION}';")

bump_text(os.path.join(app_dir, 'installer.nsi'), r'Foreigners_Studio_[\d\.]+_x64-setup\.exe', f"Foreigners_Studio_{NEW_VERSION}_x64-setup.exe")

latest_paths = [
    os.path.join(app_dir, 'dist-release', 'latest.json'),
    os.path.join(os.path.dirname(app_dir), 'foreigners-studio-releases', 'latest.json')
]
now_str = datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ")
for latest_json_path in latest_paths:
    if os.path.exists(latest_json_path):
        with open(latest_json_path, 'r', encoding='utf-8') as f:
            latest = json.load(f)
        latest['version'] = NEW_VERSION
        latest['notes'] = ""
        latest['pub_date'] = now_str
        latest['platforms'] = {
            "windows-x86_64": {
                "url": f"https://github.com/pankaj886/foreigners-studio-releases/releases/download/v{NEW_VERSION}/Foreigners_Studio_{NEW_VERSION}_x64-setup.exe"
            },
            "darwin-universal": {
                "url": f"https://github.com/pankaj886/foreigners-studio-releases/releases/download/v{NEW_VERSION}/Foreigners_Studio_{NEW_VERSION}_universal.dmg"
            }
        }
        with open(latest_json_path, 'w', encoding='utf-8') as f:
            json.dump(latest, f, indent=2)

print(f"Successfully bumped version configuration to {NEW_VERSION}.")
print("[CRITICAL NOTICE] Old binary files are NOT copied forward to prevent corrupt release loops.")
print("Build new binaries via CI or local build before publishing release.")

