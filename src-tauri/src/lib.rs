use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

const SESSION_MAX_DURATION_SECS: u64 = 7 * 24 * 3600;
const SESSION_MAX_INACTIVITY_SECS: u64 = 24 * 3600;

const GOOGLE_CLIENT_ID: &str = "854859981023-n5pmt0docrrpu16lum1tjpddojfqoqlv.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET: &str = "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";

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct UserSession {
    pub email: String,
    pub name: String,
    pub picture: String,
    pub id_token: String,
    pub access_token: String,
    pub expires_at: u64,
}

fn url_encode(input: &str) -> String {
    let mut encoded = String::new();
    for byte in input.bytes() {
        match byte {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

fn url_decode(input: &str) -> String {
    let mut decoded = String::new();
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '%' {
            let h1 = chars.next().unwrap_or('0');
            let h2 = chars.next().unwrap_or('0');
            let hex_str = format!("{}{}", h1, h2);
            if let Ok(byte) = u8::from_str_radix(&hex_str, 16) {
                decoded.push(byte as char);
            }
        } else if c == '+' {
            decoded.push(' ');
        } else {
            decoded.push(c);
        }
    }
    decoded
}

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

fn create_silent_command<S: AsRef<std::ffi::OsStr>>(program: S) -> std::process::Command {
    #[allow(unused_mut)]
    let mut cmd = std::process::Command::new(program);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

fn open_browser(url: &str) {
    #[cfg(target_os = "windows")]
    {
        let _ = create_silent_command("rundll32.exe")
            .args(["url.dll,FileProtocolHandler", url])
            .spawn();
    }
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(url)
            .spawn();
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg(url)
            .spawn();
    }
}

#[tauri::command]
fn app_minimize(window: tauri::Window) {
    let _ = window.minimize();
}

#[tauri::command]
fn app_toggle_maximize(window: tauri::Window) {
    if let Ok(is_max) = window.is_maximized() {
        if is_max {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[tauri::command]
fn app_close(window: tauri::Window) {
    let _ = window.close();
}

#[tauri::command]
fn app_is_maximized(window: tauri::Window) -> bool {
    window.is_maximized().unwrap_or(false)
}

#[tauri::command]
fn app_restart(app_handle: tauri::AppHandle) {
    app_handle.restart();
}

#[tauri::command]
fn app_start_dragging(window: tauri::Window) {
    let _ = window.start_dragging();
}

#[tauri::command]
fn get_platform() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "macos"
    }
    #[cfg(target_os = "windows")]
    {
        "windows"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        "unknown"
    }
}

#[tauri::command]
fn app_focus_window(window: tauri::Window) {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
async fn download_installer(url: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let file_name = if url.ends_with(".dmg") {
        "Foreigners_Studio_Update.dmg"
    } else {
        "Foreigners_Studio_Update.exe"
    };
    let target_path = temp_dir.join(file_name);
    let target_str = target_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let status = create_silent_command("curl.exe")
            .args(["-s", "-L", "-o", &target_str, &url])
            .status()
            .map_err(|e| format!("Failed to execute curl: {}", e))?;

        if !status.success() {
            return Err("Failed to download update binary via curl".into());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let status = create_silent_command("curl")
            .args(["-s", "-L", "-o", &target_str, &url])
            .status()
            .map_err(|e| format!("Failed to execute curl: {}", e))?;

        if !status.success() {
            return Err("Failed to download update binary via curl".into());
        }
    }

    Ok(target_str)
}

#[tauri::command]
fn apply_update_and_restart(app_handle: tauri::AppHandle, installer_path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
        let app_exe = format!(r"{}\Foreigners Studio\foreigners_studio.exe", local_app_data);

        let ps_cmd = format!(
            "Start-Process -FilePath '{}' -ArgumentList '/S' -Wait; Start-Process -FilePath '{}'",
            installer_path, app_exe
        );

        let _ = create_silent_command("powershell.exe")
            .args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &ps_cmd])
            .spawn()
            .map_err(|e| format!("Failed to spawn update process: {}", e))?;

        app_handle.exit(0);
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg(&installer_path)
            .spawn()
            .map_err(|e| format!("Failed to open macOS installer: {}", e))?;

        app_handle.exit(0);
        Ok(())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        app_handle.restart();
        Ok(())
    }
}

fn perform_google_login() -> Result<UserSession, String> {
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to bind local loopback listener: {}", e))?;
    listener.set_nonblocking(true)
        .map_err(|e| format!("Failed to configure listener: {}", e))?;

    let port = listener.local_addr()
        .map_err(|e| format!("Failed to get local port: {}", e))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);
    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account",
        GOOGLE_CLIENT_ID,
        url_encode(&redirect_uri)
    );

    open_browser(&auth_url);

    let start = Instant::now();
    let mut code_opt = None;

    while start.elapsed() < Duration::from_secs(180) {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                let mut buffer = [0u8; 4096];
                if let Ok(bytes_read) = stream.read(&mut buffer) {
                    if bytes_read > 0 {
                        let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

                        if request_str.starts_with("GET /callback") {
                            if let Some(query_start) = request_str.find("/callback?") {
                                let query_line = &request_str[query_start + 10..];
                                let end = query_line.find(' ').unwrap_or(query_line.len());
                                let query_str = &query_line[..end];

                                for pair in query_str.split('&') {
                                    if let Some(eq_idx) = pair.find('=') {
                                        let key = &pair[..eq_idx];
                                        let val = &pair[eq_idx + 1..];
                                        if key == "code" {
                                            code_opt = Some(url_decode(val));
                                        }
                                    }
                                }
                            }

                            let html_response = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Foreigners Studio - Authentication Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      padding: 48px 36px;
      text-align: center;
      max-width: 460px;
      width: 100%;
      box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1);
      animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      from { opacity: 0; transform: scale(0.95) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .icon-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #eff6ff;
      border: 2px solid #3b82f6;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(37, 99, 235, 0.18);
    }
    .checkmark {
      width: 42px;
      height: 42px;
      stroke: #2563eb;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: drawCheck 0.6s ease-out 0.2s forwards;
    }
    @keyframes drawCheck {
      to { stroke-dashoffset: 0; }
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 10px;
      color: #0f172a;
    }
    p.desc {
      font-size: 15px;
      color: #64748b;
      line-height: 1.5;
      margin-bottom: 30px;
    }
    .btn-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 15px 24px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #ffffff;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }
    .action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
      background: linear-gradient(135deg, #1d4ed8, #1e40af);
    }
    .action-btn:active {
      transform: translateY(0);
    }
    .hint {
      margin-top: 24px;
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-wrapper">
      <svg class="checkmark" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Authentication Successful!</h1>
    <p class="desc">You have securely signed in with your Google account. Return to Foreigners Studio to access your portal.</p>
    <div class="btn-container">
      <button class="action-btn" onclick="openPortal()">Open FS Portal</button>
    </div>
    <p class="hint" id="statusHint">You can safely close this browser window at any time.</p>
  </div>
  <script>
    function openPortal() {
      const btn = document.querySelector('.action-btn');
      const hint = document.getElementById('statusHint');
      btn.innerText = 'Switching to Foreigners Studio...';
      btn.style.opacity = '0.7';
      hint.innerText = 'Foreigners Studio is now active. You may close this tab.';
      try { window.close(); } catch(e) {}
    }
  </script>
</body>
</html>"#;

                            let response_bytes = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                                html_response.len(),
                                html_response
                            );

                            let _ = stream.write_all(response_bytes.as_bytes());
                            let _ = stream.flush();

                            break;
                        } else {
                            let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
                            let _ = stream.flush();
                        }
                    }
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => {
                return Err(format!("Loopback listener error: {}", e));
            }
        }
    }

    let code = match code_opt {
        Some(c) => c,
        None => return Err("Authentication timed out or was cancelled. Please try again.".into()),
    };

    #[cfg(target_os = "windows")]
    let curl_cmd = "curl.exe";
    #[cfg(not(target_os = "windows"))]
    let curl_cmd = "curl";

    let post_data = format!(
        "code={}&client_id={}&client_secret={}&redirect_uri={}&grant_type=authorization_code",
        url_encode(&code),
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        url_encode(&redirect_uri)
    );

    let output = create_silent_command(curl_cmd)
        .args([
            "-s",
            "-X", "POST",
            "https://oauth2.googleapis.com/token",
            "-H", "Content-Type: application/x-www-form-urlencoded",
            "-d", &post_data,
        ])
        .output()
        .map_err(|e| format!("Failed to request token from Google: {}", e))?;

    let token_json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("Invalid JSON response from Google token endpoint: {}", e))?;

    if let Some(err) = token_json.get("error").and_then(|v| v.as_str()) {
        let desc = token_json.get("error_description").and_then(|v| v.as_str()).unwrap_or(err);
        return Err(format!("Google authentication failed: {}", desc));
    }

    let access_token = token_json.get("access_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing access_token from Google".to_string())?
        .to_string();

    let id_token = token_json.get("id_token")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing id_token from Google".to_string())?
        .to_string();

    let expires_in = token_json.get("expires_in")
        .and_then(|v| v.as_u64())
        .unwrap_or(3600);

    let verify_output = create_silent_command(curl_cmd)
        .args([
            "-s",
            &format!("https://oauth2.googleapis.com/tokeninfo?id_token={}", id_token),
        ])
        .output()
        .map_err(|e| format!("Failed to verify token with Google: {}", e))?;

    let verify_json: serde_json::Value = serde_json::from_slice(&verify_output.stdout)
        .map_err(|e| format!("Invalid cryptographic verification response: {}", e))?;

    let aud = verify_json.get("aud").and_then(|v| v.as_str()).unwrap_or_default();
    if aud != GOOGLE_CLIENT_ID {
        return Err("Security verification failed: Token audience does not match application client ID".into());
    }

    let iss = verify_json.get("iss").and_then(|v| v.as_str()).unwrap_or_default();
    if iss != "https://accounts.google.com" && iss != "accounts.google.com" {
        return Err("Security verification failed: Invalid token issuer".into());
    }

    let email = verify_json.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let name = verify_json.get("name").and_then(|v| v.as_str()).unwrap_or("Foreigners Studio User").to_string();
    let picture = verify_json.get("picture").and_then(|v| v.as_str()).unwrap_or("").to_string();

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let expires_at = now + expires_in;

    Ok(UserSession {
        email,
        name,
        picture,
        id_token,
        access_token,
        expires_at,
    })
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct SessionPayload {
    pub email: String,
    pub name: String,
    pub picture: String,
    pub id_token: String,
    pub access_token: String,
    pub created_at: u64,
    pub last_active_at: u64,
}

fn get_session_dir() -> std::path::PathBuf {
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            let p = std::path::PathBuf::from(local_app_data).join("ForeignersStudio").join("session");
            let _ = std::fs::create_dir_all(&p);
            return p;
        }
    }
    if let Ok(home) = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")) {
        let p = std::path::PathBuf::from(home).join(".foreigners_studio").join("session");
        let _ = std::fs::create_dir_all(&p);
        return p;
    }
    let p = std::env::temp_dir().join("foreigners_studio_session");
    let _ = std::fs::create_dir_all(&p);
    p
}

fn get_or_create_session_secret() -> Vec<u8> {
    let key_file = get_session_dir().join("session_hmac.key");
    if let Ok(data) = std::fs::read(&key_file) {
        if data.len() >= 32 {
            return data;
        }
    }
    let mut key = vec![0u8; 32];
    let seed1 = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    let seed2 = std::process::id();
    let seed_str = format!("fs_secret_token_seed_{}_{}_entropy", seed1, seed2);
    use sha2::Digest;
    let hash = sha2::Sha256::digest(seed_str.as_bytes());
    key.copy_from_slice(&hash[..32]);
    let _ = std::fs::write(&key_file, &key);
    key
}

fn compute_hmac_hex(secret: &[u8], data: &[u8]) -> String {
    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC can take key of any size");
    mac.update(data);
    let result = mac.finalize();
    let bytes = result.into_bytes();
    let mut hex = String::new();
    for b in bytes {
        hex.push_str(&format!("{:02x}", b));
    }
    hex
}

fn sign_and_save_session(payload: &SessionPayload) -> Result<String, String> {
    let json_bytes = serde_json::to_vec(payload).map_err(|e| e.to_string())?;
    let secret = get_or_create_session_secret();
    let hmac_hex = compute_hmac_hex(&secret, &json_bytes);

    let mut hex_data = String::new();
    for b in json_bytes {
        hex_data.push_str(&format!("{:02x}", b));
    }
    let token = format!("{}.{}", hex_data, hmac_hex);

    let session_file = get_session_dir().join("active_session.token");
    let _ = std::fs::write(&session_file, token.as_bytes());

    Ok(token)
}

#[tauri::command]
async fn verify_secure_session(session_token: Option<String>) -> Result<UserSession, String> {
    let token = match session_token.filter(|s| !s.trim().is_empty()) {
        Some(t) => t,
        None => {
            let session_file = get_session_dir().join("active_session.token");
            if let Ok(disk_bytes) = std::fs::read(&session_file) {
                String::from_utf8_lossy(&disk_bytes).trim().to_string()
            } else {
                return Err("No active session found.".into());
            }
        }
    };

    if token.is_empty() {
        return Err("No active session found.".into());
    }

    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 2 {
        let _ = std::fs::remove_file(get_session_dir().join("active_session.token"));
        return Err("Malformed cryptographic session token.".into());
    }

    let hex_data = parts[0];
    let sig_hex = parts[1];

    if hex_data.len() % 2 != 0 {
        return Err("Invalid token format.".into());
    }
    let mut json_bytes = Vec::new();
    for i in (0..hex_data.len()).step_by(2) {
        if let Ok(b) = u8::from_str_radix(&hex_data[i..i+2], 16) {
            json_bytes.push(b);
        } else {
            return Err("Invalid token hex encoding.".into());
        }
    }

    let secret = get_or_create_session_secret();
    let expected_sig = compute_hmac_hex(&secret, &json_bytes);

    if expected_sig != sig_hex {
        let _ = std::fs::remove_file(get_session_dir().join("active_session.token"));
        return Err("Cryptographic signature verification failed.".into());
    }

    let mut payload: SessionPayload = serde_json::from_slice(&json_bytes)
        .map_err(|e| format!("Corrupted session payload: {}", e))?;

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();

    if now.saturating_sub(payload.created_at) > SESSION_MAX_DURATION_SECS {
        let _ = std::fs::remove_file(get_session_dir().join("active_session.token"));
        return Err("Session expired after 7 days. Please sign in again.".into());
    }

    if now.saturating_sub(payload.last_active_at) > SESSION_MAX_INACTIVITY_SECS {
        let _ = std::fs::remove_file(get_session_dir().join("active_session.token"));
        return Err("Session expired due to 24 hours of inactivity. Please sign in again.".into());
    }

    payload.last_active_at = now;
    let _ = sign_and_save_session(&payload);

    Ok(UserSession {
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        id_token: payload.id_token,
        access_token: payload.access_token,
        expires_at: payload.created_at + SESSION_MAX_DURATION_SECS,
    })
}

#[tauri::command]
async fn save_secure_session(session: UserSession) -> Result<String, String> {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let payload = SessionPayload {
        email: session.email,
        name: session.name,
        picture: session.picture,
        id_token: session.id_token,
        access_token: session.access_token,
        created_at: now,
        last_active_at: now,
    };
    sign_and_save_session(&payload)
}

#[tauri::command]
async fn touch_session_activity() -> Result<(), String> {
    let session_file = get_session_dir().join("active_session.token");
    if let Ok(disk_bytes) = std::fs::read(&session_file) {
        let token = String::from_utf8_lossy(&disk_bytes).trim().to_string();
        let _ = verify_secure_session(Some(token)).await;
    }
    Ok(())
}

#[tauri::command]
async fn clear_saved_session() -> Result<(), String> {
    let session_file = get_session_dir().join("active_session.token");
    let _ = std::fs::remove_file(session_file);
    Ok(())
}

#[tauri::command]
async fn start_google_login(window: tauri::Window) -> Result<UserSession, String> {
    let session = tauri::async_runtime::spawn_blocking(move || {
        perform_google_login()
    })
    .await
    .map_err(|e| format!("Login worker task failed: {}", e))??;

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    let payload = SessionPayload {
        email: session.email.clone(),
        name: session.name.clone(),
        picture: session.picture.clone(),
        id_token: session.id_token.clone(),
        access_token: session.access_token.clone(),
        created_at: now,
        last_active_at: now,
    };
    let _ = sign_and_save_session(&payload);

    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();

    Ok(session)
}

#[tauri::command]
async fn verify_google_session(id_token: String) -> Result<UserSession, String> {
    if let Ok(sec_session) = verify_secure_session(None).await {
        return Ok(sec_session);
    }

    tauri::async_runtime::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        let curl_cmd = "curl.exe";
        #[cfg(not(target_os = "windows"))]
        let curl_cmd = "curl";

        let verify_output = create_silent_command(curl_cmd)
            .args([
                "-s",
                &format!("https://oauth2.googleapis.com/tokeninfo?id_token={}", id_token),
            ])
            .output()
            .map_err(|e| format!("Failed to reach Google token verification service: {}", e))?;

        let verify_json: serde_json::Value = serde_json::from_slice(&verify_output.stdout)
            .map_err(|e| format!("Invalid response from verification service: {}", e))?;

        if let Some(err) = verify_json.get("error").and_then(|v| v.as_str()) {
            return Err(format!("Token is invalid or expired: {}", err));
        }

        let aud = verify_json.get("aud").and_then(|v| v.as_str()).unwrap_or_default();
        if aud != GOOGLE_CLIENT_ID {
            return Err("Audience verification failed".into());
        }

        let iss = verify_json.get("iss").and_then(|v| v.as_str()).unwrap_or_default();
        if iss != "https://accounts.google.com" && iss != "accounts.google.com" {
            return Err("Issuer verification failed".into());
        }

        let exp_str = verify_json.get("exp").and_then(|v| v.as_str()).unwrap_or("0");
        let exp = exp_str.parse::<u64>().unwrap_or(0);
        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
        if exp != 0 && exp <= now {
            return Err("Session has expired. Please sign in again.".into());
        }

        let email = verify_json.get("email").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let name = verify_json.get("name").and_then(|v| v.as_str()).unwrap_or("User").to_string();
        let picture = verify_json.get("picture").and_then(|v| v.as_str()).unwrap_or("").to_string();

        let session = UserSession {
            email,
            name,
            picture,
            id_token: id_token.clone(),
            access_token: String::new(),
            expires_at: exp,
        };

        let payload = SessionPayload {
            email: session.email.clone(),
            name: session.name.clone(),
            picture: session.picture.clone(),
            id_token,
            access_token: String::new(),
            created_at: now,
            last_active_at: now,
        };
        let _ = sign_and_save_session(&payload);

        Ok(session)
    })
    .await
    .map_err(|e| format!("Verification worker failed: {}", e))?
}

#[derive(serde::Serialize)]
pub struct LocalFileInfo {
    pub name: String,
    pub data: Vec<u8>,
}

#[tauri::command]
async fn read_local_file(path: String) -> Result<LocalFileInfo, String> {
    let p = std::path::Path::new(&path);
    if !p.exists() || !p.is_file() {
        return Err(format!("File '{}' does not exist or is not a regular file.", path));
    }
    let name = p.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "file".to_string());
    let data = std::fs::read(p).map_err(|e| format!("Failed to read file {}: {}", path, e))?;
    Ok(LocalFileInfo { name, data })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            app_minimize,
            app_toggle_maximize,
            app_close,
            app_is_maximized,
            app_restart,
            app_start_dragging,
            app_focus_window,
            download_installer,
            apply_update_and_restart,
            start_google_login,
            verify_google_session,
            verify_secure_session,
            save_secure_session,
            touch_session_activity,
            clear_saved_session,
            read_local_file,
            get_platform
        ])
        .run(tauri::generate_context!())
        .expect("error while running Foreigners Studio application");
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_core_initialization() {
        assert_eq!(2 + 2, 4);
    }
}
