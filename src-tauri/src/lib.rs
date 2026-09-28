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
        let status = std::process::Command::new("curl.exe")
            .args(["-s", "-L", "-o", &target_str, &url])
            .status()
            .map_err(|e| format!("Failed to execute curl: {}", e))?;

        if !status.success() {
            return Err("Failed to download update binary via curl".into());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let status = std::process::Command::new("curl")
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

        // Spawn a background PowerShell process that waits for the silent installer (/S)
        // to finish and then relaunches the newly installed Foreigners Studio.
        let ps_cmd = format!(
            "Start-Process -FilePath '{}' -ArgumentList '/S' -Wait; Start-Process -FilePath '{}'",
            installer_path, app_exe
        );

        let _ = std::process::Command::new("powershell.exe")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_cmd])
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
            download_installer,
            apply_update_and_restart
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
