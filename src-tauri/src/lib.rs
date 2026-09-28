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
            app_restart
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
