import time
import requests
import zipfile
import io
import os
import subprocess

TOKEN = "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"
REPO = "pankaj886/application"
APP_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(APP_DIR, "dist-release")

headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json"
}

def monitor_and_sync():
    print("Fetching latest workflow run for pankaj886/application...", flush=True)
    r = requests.get(f"https://api.github.com/repos/{REPO}/actions/runs", headers=headers)
    runs = r.json().get("workflow_runs", [])
    if not runs:
        print("No workflow runs found.")
        return
    
    run = runs[0]
    run_id = run["id"]
    print(f"Monitoring Run ID: {run_id} ({run['name']})...", flush=True)

    while True:
        r = requests.get(f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}", headers=headers)
        data = r.json()
        status = data.get("status")
        conclusion = data.get("conclusion")
        print(f"Status: {status}, Conclusion: {conclusion}", flush=True)

        # Check if windows job is done
        jr = requests.get(f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}/jobs", headers=headers)
        jobs = jr.json().get("jobs", [])
        win_job = next((j for j in jobs if "Windows" in j["name"]), None)
        if win_job:
            print(f"Windows Job status: {win_job.get('status')}, conclusion: {win_job.get('conclusion')}", flush=True)
            if win_job.get("status") == "completed":
                if win_job.get("conclusion") != "success":
                    raise RuntimeError(f"Windows build job failed with conclusion: {win_job.get('conclusion')}")
                break

        if status == "completed":
            if conclusion != "success" and (not win_job or win_job.get("conclusion") != "success"):
                raise RuntimeError(f"Workflow run failed with conclusion: {conclusion}")
            break

        time.sleep(20)

    print("Checking artifacts...", flush=True)
    ar = requests.get(f"https://api.github.com/repos/{REPO}/actions/runs/{run_id}/artifacts", headers=headers)
    artifacts = ar.json().get("artifacts", [])
    win_artifact = next((a for a in artifacts if "windows-bundle" in a["name"]), None)

    if not win_artifact:
        print("No windows-bundle artifact found yet.")
        return

    art_id = win_artifact["id"]
    print(f"Downloading artifact {art_id} ({win_artifact['size_in_bytes']} bytes)...", flush=True)
    down_r = requests.get(f"https://api.github.com/repos/{REPO}/actions/artifacts/{art_id}/zip", headers=headers)
    
    if down_r.status_code == 200:
        with zipfile.ZipFile(io.BytesIO(down_r.content)) as z:
            for member in z.namelist():
                # Extract to dist-release
                basename = os.path.basename(member)
                if basename:
                    target_file = os.path.join(DIST_DIR, basename)
                    with open(target_file, "wb") as f:
                        f.write(z.read(member))
                    print(f"Extracted: {basename} -> {target_file}", flush=True)

        # Build custom NSIS setup installer if makensis is available
        nsis_script = os.path.join(APP_DIR, "installer.nsi")
        makensis_exe = os.path.expandvars(r"%LOCALAPPDATA%\tauri\NSIS\makensis.exe")
        if os.path.exists(nsis_script) and os.path.exists(makensis_exe):
            print("Compiling NSIS installer with verified binary...", flush=True)
            subprocess.run([makensis_exe, nsis_script], check=True)

        print("Re-signing release artifacts with Authenticode...", flush=True)
        sign_ps = os.path.join(APP_DIR, "sign-release.ps1")
        subprocess.run(["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", sign_ps], check=False)

        print("Publishing final release to GitHub...", flush=True)
        pub_script = os.path.join(APP_DIR, "publish_release.py")
        subprocess.run([sys.executable, pub_script], check=True)
        print("[SUCCESS] Build and release pipeline completed!", flush=True)

if __name__ == "__main__":
    monitor_and_sync()
