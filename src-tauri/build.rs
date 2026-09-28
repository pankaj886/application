fn main() {
    #[cfg(windows)]
    fix_windows_env();

    let mut attrs = tauri_build::Attributes::new();

    #[cfg(windows)]
    {
        let mut windows_attrs = tauri_build::WindowsAttributes::new();
        let icon_path = std::path::Path::new("icons/icon.ico");
        if icon_path.exists() {
            let full_icon = std::env::current_dir()
                .map(|cd| cd.join(icon_path))
                .unwrap_or_else(|_| icon_path.to_path_buf());
            let short_icon = to_short_path(&full_icon);
            windows_attrs = windows_attrs.window_icon_path(short_icon);
        }
        attrs = attrs.windows_attributes(windows_attrs);
    }

    if let Err(e) = tauri_build::try_build(attrs) {
        eprintln!("cargo:warning=tauri_build::try_build error: {e}");
        #[cfg(not(windows))]
        panic!("tauri_build::try_build failed: {e}");
    }

    #[cfg(windows)]
    ensure_webview2_loader();
}

#[cfg(windows)]
fn fix_windows_env() {
    use std::path::Path;

    if let Ok(out_dir) = std::env::var("OUT_DIR") {
        let path = Path::new(&out_dir);
        let _ = std::fs::create_dir_all(path);
        let short = to_short_path(path);
        unsafe {
            std::env::set_var("OUT_DIR", &short);
        }
    }
}

#[cfg(windows)]
fn strip_unc(path: std::path::PathBuf) -> std::path::PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        std::path::PathBuf::from(stripped)
    } else {
        path
    }
}

#[cfg(windows)]
fn to_short_path(path: &std::path::Path) -> std::path::PathBuf {
    use std::ffi::OsString;
    use std::os::windows::ffi::{OsStrExt, OsStringExt};

    extern "system" {
        fn GetShortPathNameW(
            lpszLongPath: *const u16,
            lpszShortPath: *mut u16,
            cchBuffer: u32,
        ) -> u32;
    }

    let mut wide: Vec<u16> = path.as_os_str().encode_wide().collect();
    wide.push(0);

    let len = unsafe { GetShortPathNameW(wide.as_ptr(), std::ptr::null_mut(), 0) };
    if len == 0 {
        return strip_unc(path.to_path_buf());
    }

    let mut buf = vec![0u16; len as usize];
    let res = unsafe { GetShortPathNameW(wide.as_ptr(), buf.as_mut_ptr(), len) };
    if res == 0 || res >= len {
        return strip_unc(path.to_path_buf());
    }

    let short_buf = OsString::from_wide(&buf[..res as usize]);
    strip_unc(std::path::PathBuf::from(short_buf))
}

#[cfg(windows)]
fn ensure_webview2_loader() {
    if let Ok(out_dir_str) = std::env::var("OUT_DIR") {
        let out_dir = std::path::PathBuf::from(out_dir_str);
        if let Some(target_dir) = out_dir
            .ancestors()
            .find(|p| p.file_name() == Some(std::ffi::OsStr::new("build")))
            .and_then(|p| p.parent())
        {
            let dest = target_dir.join("WebView2Loader.dll");
            if !dest.exists() {
                let target_arch = match std::env::var("CARGO_CFG_TARGET_ARCH").as_deref() {
                    Ok("x86_64") => "x64",
                    Ok("x86") => "x86",
                    Ok("aarch64") => "arm64",
                    _ => "x64",
                };
                let build_dir = target_dir.join("build");
                if let Ok(entries) = std::fs::read_dir(&build_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.to_string_lossy().contains("webview2-com-sys") {
                            let loader = path.join("out").join(target_arch).join("WebView2Loader.dll");
                            if loader.exists() {
                                let _ = std::fs::copy(loader, &dest);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
}
