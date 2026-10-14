import os
import sys
import json
import base64
import requests

DEFAULT_TOKEN = "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"

def get_token():
    return os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or DEFAULT_TOKEN

TOKEN = get_token()
REPO = "pankaj886/foreigners-studio-releases"

pkg_file = os.path.join(os.path.dirname(__file__), "package.json")
with open(pkg_file, "r", encoding="utf-8") as f:
    VERSION = json.load(f).get("version", "1.0.82")

TAG = f"v{VERSION}"
NAME = f"Foreigners Studio {TAG}"
BODY = f"Release {TAG}"

DIST_DIR = os.path.join(os.path.dirname(__file__), "dist-release")

headers = {
    "Authorization": f"token {TOKEN}",
    "User-Agent": "ForeignersStudio-Release-Uploader",
    "Accept": "application/vnd.github.v3+json"
}

def api_request(url, method="GET", data=None, json_data=None):
    resp = requests.request(method, url, headers=headers, data=data, json=json_data, timeout=30)
    if resp.status_code == 404:
        raise requests.HTTPError(response=resp)
    resp.raise_for_status()
    if resp.content:
        return resp.json()
    return None

def get_or_create_release():
    print(f"Checking for release {TAG} in {REPO}...", flush=True)
    try:
        rel = api_request(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}")
        print(f"Found existing release: ID {rel['id']}", flush=True)
        return rel
    except Exception:
        pass

    print(f"Creating new release {TAG}...", flush=True)
    payload = {
        "tag_name": TAG,
        "target_commitish": "main",
        "name": NAME,
        "body": BODY,
        "draft": False,
        "prerelease": False
    }
    rel = api_request(f"https://api.github.com/repos/{REPO}/releases", method="POST", json_data=payload)
    print(f"Successfully created release: ID {rel['id']}", flush=True)
    return rel

def upload_asset(upload_url_template, file_path, asset_name):
    base_url = upload_url_template.split("{")[0]
    upload_url = f"{base_url}?name={asset_name}"
    size = os.path.getsize(file_path)
    print(f"Uploading {asset_name} ({size} bytes)...", flush=True)

    content_type = "application/octet-stream"
    if asset_name.endswith(".json"):
        content_type = "application/json"
    elif asset_name.endswith(".zip"):
        content_type = "application/zip"

    upload_headers = dict(headers)
    upload_headers["Content-Type"] = content_type

    with open(file_path, "rb") as f:
        resp = requests.post(upload_url, headers=upload_headers, data=f, timeout=120)
    resp.raise_for_status()
    res = resp.json()
    print(f"[OK] Uploaded {asset_name}: ID {res['id']}", flush=True)

def update_main_manifest():
    latest_file = os.path.join(DIST_DIR, "latest.json")
    if not os.path.exists(latest_file):
        return
    print("\nSyncing latest.json to main branch on GitHub...", flush=True)
    with open(latest_file, "rb") as f:
        content_b64 = base64.b64encode(f.read()).decode("utf-8")

    url = f"https://api.github.com/repos/{REPO}/contents/latest.json"
    sha = None
    try:
        cur = api_request(url)
        sha = cur.get("sha")
    except Exception:
        pass

    payload = {
        "message": f"Update latest.json for {TAG}",
        "content": content_b64,
        "branch": "main"
    }
    if sha:
        payload["sha"] = sha

    try:
        api_request(url, method="PUT", json_data=payload)
        print("[OK] Successfully updated latest.json on main branch!", flush=True)
    except Exception as e:
        print(f"Note updating main branch manifest: {e}", flush=True)

def verify_binary_version():
    exe_path = os.path.join(DIST_DIR, "foreigners_studio.exe")
    if os.path.exists(exe_path):
        import subprocess
        cmd = f"(Get-Item -LiteralPath '{exe_path}').VersionInfo.ProductVersion"
        try:
            res = subprocess.run(["powershell.exe", "-NoProfile", "-Command", cmd], capture_output=True, text=True, check=True)
            prod_ver = res.stdout.strip()
            if prod_ver and prod_ver != VERSION:
                raise ValueError(f"FATAL: foreigners_studio.exe version '{prod_ver}' does not match target release version '{VERSION}'! Halting upload to prevent infinite restart loop.")
            print(f"[VERIFIED] foreigners_studio.exe product version matches target release: {prod_ver}", flush=True)
        except Exception as e:
            if "FATAL" in str(e):
                raise
            print(f"Warning: Could not verify exe version ({e}), proceeding with caution.", flush=True)

def main():
    verify_binary_version()
    rel = get_or_create_release()
    upload_url = rel["upload_url"]
    existing_assets = {a["name"]: a["id"] for a in rel.get("assets", [])}

    assets = [
        f"Foreigners_Studio_{VERSION}_universal.dmg",
        f"Foreigners_Studio_{VERSION}_x64-setup.exe",
        f"Foreigners_Studio_{VERSION}_x64_en-US.msi",
        "Foreigners_Studio_Windows_x64.zip",
        "latest.json"
    ]

    for asset_name in assets:
        path = os.path.join(DIST_DIR, asset_name)
        if not os.path.exists(path):
            print(f"WARNING: File not found: {path}", flush=True)
            continue

        if asset_name in existing_assets:
            print(f"Asset {asset_name} already exists (ID {existing_assets[asset_name]}). Deleting old asset...", flush=True)
            api_request(f"https://api.github.com/repos/{REPO}/releases/assets/{existing_assets[asset_name]}", method="DELETE")
            print(f"Deleted old {asset_name}.", flush=True)

        upload_asset(upload_url, path, asset_name)

    print("\nAll release assets uploaded successfully to GitHub!", flush=True)
    update_main_manifest()

if __name__ == "__main__":
    main()
