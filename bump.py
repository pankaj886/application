import os, json, re

def bump_json(file, key_path):
    if not os.path.exists(file): return
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    parts = key_path.split('.')
    d = data
    for p in parts[:-1]:
        d = d[p]
    d[parts[-1]] = "1.0.22"
    
    with open(file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

bump_json(r'c:\Users\Work PC\Documents\passport\Application\package.json', 'version')
bump_json(r'c:\Users\Work PC\Documents\passport\Application\src-tauri\tauri.conf.json', 'version')

def bump_text(file, regex_old, replacement):
    if not os.path.exists(file): return
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    content = re.sub(regex_old, replacement, content)
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

bump_text(r'c:\Users\Work PC\Documents\passport\Application\src-tauri\Cargo.toml', r'version = "[^"]+"', 'version = "1.0.22"')
bump_text(r'c:\Users\Work PC\Documents\passport\Application\src\components\Sidebar.tsx', r'v\d+\.\d+\.\d+', 'v1.0.22')

print("Bumped to 1.0.22")
