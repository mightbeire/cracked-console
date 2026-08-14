use serde::Deserialize;
use serde_json::Value as JsonValue;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteConnection},
    Connection,
};
use std::{fs, time::Duration};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const MAX_JSON_BYTES: u64 = 64 * 1024 * 1024;

fn require_json_path(path: &str) -> Result<(), String> {
    if !path.to_ascii_lowercase().ends_with(".json") {
        return Err("File path must end in .json".into());
    }
    Ok(())
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    require_json_path(&path)?;
    if contents.len() as u64 > MAX_JSON_BYTES {
        return Err("JSON file exceeds the 64 MB safety limit.".into());
    }
    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    require_json_path(&path)?;
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    if metadata.len() > MAX_JSON_BYTES {
        return Err("JSON file exceeds the 64 MB safety limit.".into());
    }
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SqlOperation {
    sql: String,
    params: Vec<JsonValue>,
}

fn bind_json_value<'q>(
    mut query: sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    value: JsonValue,
) -> Result<
    sqlx::query::Query<'q, sqlx::Sqlite, sqlx::sqlite::SqliteArguments<'q>>,
    String,
> {
    if value.is_null() {
        query = query.bind(Option::<String>::None);
    } else if let Some(value) = value.as_str() {
        query = query.bind(value.to_owned());
    } else if let Some(value) = value.as_i64() {
        query = query.bind(value);
    } else if let Some(value) = value.as_u64() {
        let value = i64::try_from(value)
            .map_err(|_| "SQL integer parameter is larger than SQLite INTEGER.".to_string())?;
        query = query.bind(value);
    } else if let Some(value) = value.as_f64() {
        query = query.bind(value);
    } else if let Some(value) = value.as_bool() {
        query = query.bind(if value { 1_i64 } else { 0_i64 });
    } else {
        return Err("SQL transaction parameters must be null, text, numbers, or booleans.".into());
    }

    Ok(query)
}

#[tauri::command]
async fn execute_sql_transaction(
    app: tauri::AppHandle,
    operations: Vec<SqlOperation>,
) -> Result<(), String> {
    if operations.is_empty() {
        return Err("SQL transaction has no operations.".into());
    }

    let app_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;

    let db_path = app_dir.join("cracked-console.db");
    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true)
        .busy_timeout(Duration::from_secs(10));

    let mut connection = SqliteConnection::connect_with(&options)
        .await
        .map_err(|error| format!("Could not open the local database: {error}"))?;

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&mut connection)
        .await
        .map_err(|error| format!("Could not enable foreign keys: {error}"))?;

    let mut transaction = connection
        .begin()
        .await
        .map_err(|error| format!("Could not start the import transaction: {error}"))?;

    for operation in operations {
        let mut query = sqlx::query(&operation.sql);
        for value in operation.params {
            query = bind_json_value(query, value)?;
        }

        query
            .execute(&mut *transaction)
            .await
            .map_err(|error| format!("Import transaction failed: {error}"))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| format!("Could not commit the import transaction: {error}"))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_plan_schema",
            sql: include_str!("../migrations/0001_plan_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_execution_schema",
            sql: include_str!("../migrations/0002_execution.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_evidence_assessment_schema",
            sql: include_str!("../migrations/0003_evidence_assessment.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_projects_skills_schema",
            sql: include_str!("../migrations/0004_projects_skills.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_reading_practice_schema",
            sql: include_str!("../migrations/0005_reading_practice.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_settings_runtime_schema",
            sql: include_str!("../migrations/0006_settings_runtime.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_week_mastery_schema",
            sql: include_str!("../migrations/0007_week_mastery.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:cracked-console.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            write_text_file,
            read_text_file,
            execute_sql_transaction
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cracked Console");
}
