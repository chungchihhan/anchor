use std::fs;
use std::path::PathBuf;

fn get_chats_dir() -> PathBuf {
    // In dev, we want to access the "chats" folder in the project root.
    // We assume the app is running from src-tauri or similar, so we look up.
    // This is a heuristic for this specific dev setup.
    let mut path = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    
    // If we are in src-tauri, go up one level
    if path.ends_with("src-tauri") {
        path.pop();
    }
    
    path.push("chats");
    
    if !path.exists() {
        let _ = fs::create_dir(&path);
    }
    
    path
}

#[tauri::command]
fn save_chat(session: serde_json::Value) -> Result<String, String> {
    let id = session["id"].as_str().unwrap_or_default().to_string();
    let id = if id.is_empty() {
        format!("chat_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis())
    } else {
        id
    };

    let filename = format!("{}.json", id);
    let path = get_chats_dir().join(&filename);

    // Ensure the session has the ID
    let mut session_obj = session.as_object().ok_or("Invalid session format")?.clone();
    session_obj.insert("id".to_string(), serde_json::Value::String(id.clone()));
    
    let content = serde_json::to_string_pretty(&session_obj).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;

    Ok(id)
}

#[tauri::command]
fn list_chats() -> Result<Vec<serde_json::Value>, String> {
    let dir = get_chats_dir();
    let mut sessions = Vec::new();

    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(mut data) = serde_json::from_str::<serde_json::Value>(&content) {
                            // Add filename/timestamp if missing for sorting
                            if let Some(obj) = data.as_object_mut() {
                                // Force ID to match filename to ensure deletion works
                                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                                    obj.insert("id".to_string(), serde_json::Value::String(stem.to_string()));
                                }

                                if !obj.contains_key("timestamp") {
                                    if let Ok(metadata) = fs::metadata(&path) {
                                        if let Ok(created) = metadata.created() {
                                            if let Ok(duration) = created.duration_since(std::time::UNIX_EPOCH) {
                                                obj.insert("timestamp".to_string(), serde_json::Value::Number(serde_json::Number::from_f64(duration.as_secs_f64() * 1000.0).unwrap()));
                                            }
                                        }
                                    }
                                }
                            }
                            sessions.push(data);
                        }
                    }
                }
            }
        }
    }

    // Sort by timestamp descending
    sessions.sort_by(|a, b| {
        let t_a = a["timestamp"].as_f64().unwrap_or(0.0);
        let t_b = b["timestamp"].as_f64().unwrap_or(0.0);
        t_b.partial_cmp(&t_a).unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(sessions)
}

#[tauri::command]
fn load_chat(id: String) -> Result<serde_json::Value, String> {
    let filename = format!("{}.json", id);
    let path = get_chats_dir().join(filename);
    
    let content = fs::read_to_string(path).map_err(|_| "Chat not found".to_string())?;
    let data = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    
    Ok(data)
}

#[tauri::command]
fn delete_chat(id: String) -> Result<(), String> {
    let filename = format!("{}.json", id);
    let path = get_chats_dir().join(filename);
    
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .plugin(tauri_plugin_http::init())
    .invoke_handler(tauri::generate_handler![save_chat, list_chats, load_chat, delete_chat])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
