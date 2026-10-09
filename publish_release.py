import os
import sys
import json
import urllib.request
import urllib.error

import subprocess

def get_token():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token:
        return token
    try:
        proc = subprocess.run(
            ["git", "credential", "fill"],
            input="protocol=https\nhost=github.com\n",
            capture_output=True,
            text=True,
            check=True
        )
        for line in proc.stdout.splitlines():
            if line.startswith("password="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    raise RuntimeError("GitHub token not found. Please set GITHUB_TOKEN environment variable.")

TOKEN = get_token()
REPO = "pankaj886/foreigners-studio-releases"

pkg_file = os.path.join(os.path.dirname(__file__), "package.json")
with open(pkg_file, "r", encoding="utf-8") as f:
    VERSION = json.load(f).get("version", "1.0.25")

TAG = f"v{VERSION}"
NAME = f"Foreigners Studio {TAG}"
BODY = ""

DIST_DIR = os.path.join(os.path.dirname(__file__), "dist-release")

def api_request(url, method="GET", data=None, content_type="application/json"):
    headers = {
        "Authorization": f"token {TOKEN}",
        "User-Agent": "ForeignersStudio-Release-Uploader",
        "Accept": "application/vnd.github.v3+json"
    }
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
        if not body:
            return None
        return json.loads(body.decode("utf-8"))

def get_or_create_release():
    print(f"Checking for release {TAG} in {REPO}...")
    try:
        rel = api_request(f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}")
        print(f"Found existing release: ID {rel['id']}")
        return rel
    except urllib.error.HTTPError as e:
        if e.code != 404:
            raise

    print(f"Creating new release {TAG}...")
    payload = json.dumps({
        "tag_name": TAG,
        "target_commitish": "main",
        "name": NAME,
        "body": BODY,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")
    rel = api_request(f"https://api.github.com/repos/{REPO}/releases", method="POST", data=payload)
    print(f"Successfully created release: ID {rel['id']}")
    return rel

def upload_asset(upload_url_template, file_path, asset_name):
    base_url = upload_url_template.split("{")[0]
    upload_url = f"{base_url}?name={asset_name}"

    print(f"Uploading {asset_name} ({os.path.getsize(file_path)} bytes)...")
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    content_type = "application/octet-stream"
    if asset_name.endswith(".json"):
        content_type = "application/json"
    elif asset_name.endswith(".zip"):
        content_type = "application/zip"

    req = urllib.request.Request(
        upload_url,
        data=file_bytes,
        headers={
            "Authorization": f"token {TOKEN}",
            "User-Agent": "ForeignersStudio-Release-Uploader",
            "Content-Type": content_type,
            "Accept": "application/vnd.github.v3+json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"[OK] Uploaded {asset_name}: ID {res['id']}")

def main():
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
            print(f"WARNING: File not found: {path}")
            continue

        if asset_name in existing_assets:
            print(f"Asset {asset_name} already exists (ID {existing_assets[asset_name]}). Deleting old asset...")
            api_request(f"https://api.github.com/repos/{REPO}/releases/assets/{existing_assets[asset_name]}", method="DELETE", content_type=None)
            print(f"Deleted old {asset_name}.")

        upload_asset(upload_url, path, asset_name)

    print("\nAll release assets uploaded successfully to GitHub!")

if __name__ == "__main__":
    main()
