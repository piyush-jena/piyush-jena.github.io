use std::{net::SocketAddr, sync::Arc, sync::Mutex};

use axum::{
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, Method, StatusCode},
    routing::{get, put},
    Json, Router,
};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tower_http::cors::{AllowOrigin, CorsLayer};

struct AppState {
    db: Mutex<Connection>,
    token: String,
}

#[derive(Serialize)]
struct SplitDay {
    day: i64,
    focus: String,
    exercises: Vec<String>,
    rest: bool,
}

#[derive(Deserialize)]
struct SplitDayInput {
    focus: String,
    exercises: Vec<String>,
    rest: bool,
}

#[derive(Serialize)]
struct AttendanceEntry {
    date: String,
}

#[derive(Deserialize)]
struct AttendanceInput {
    date: String,
}

const DEFAULT_SPLIT: &[(i64, &str, &[&str], bool)] = &[
    (0, "Rest", &[], true),
    (1, "Push", &["Bench press", "Overhead press", "Incline dumbbell press", "Triceps pushdown"], false),
    (2, "Pull", &["Deadlift", "Barbell row", "Lat pulldown", "Curls"], false),
    (3, "Legs", &["Squat", "Romanian deadlift", "Leg press", "Calf raise"], false),
    (4, "Push", &["Incline bench", "Dumbbell shoulder press", "Dips", "Lateral raise"], false),
    (5, "Pull", &["Pull-ups", "Cable row", "Face pull", "Hammer curl"], false),
    (6, "Legs / rest", &[], true),
];

fn open_db(path: &str) -> Connection {
    let conn = Connection::open(path).expect("open sqlite db");
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS splits (
            day INTEGER PRIMARY KEY,
            focus TEXT NOT NULL,
            exercises TEXT NOT NULL,
            rest INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS attendance (
            date TEXT PRIMARY KEY
        );",
    )
    .expect("create tables");

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM splits", [], |r| r.get(0))
        .unwrap_or(0);
    if count == 0 {
        for (day, focus, exercises, rest) in DEFAULT_SPLIT {
            let exercises_json = serde_json::to_string(exercises).unwrap();
            conn.execute(
                "INSERT INTO splits (day, focus, exercises, rest) VALUES (?1, ?2, ?3, ?4)",
                params![day, focus, exercises_json, *rest as i64],
            )
            .expect("seed split");
        }
    }
    conn
}

fn is_authorized(headers: &HeaderMap, expected: &str) -> bool {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.trim_start_matches("Bearer ").trim() == expected)
        .unwrap_or(false)
}

async fn get_splits(State(state): State<Arc<AppState>>) -> Json<Vec<SplitDay>> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT day, focus, exercises, rest FROM splits ORDER BY day")
        .unwrap();
    let rows = stmt
        .query_map([], |r| {
            let exercises_json: String = r.get(2)?;
            let exercises: Vec<String> = serde_json::from_str(&exercises_json).unwrap_or_default();
            Ok(SplitDay {
                day: r.get(0)?,
                focus: r.get(1)?,
                exercises,
                rest: r.get::<_, i64>(3)? != 0,
            })
        })
        .unwrap();
    Json(rows.filter_map(Result::ok).collect())
}

async fn put_split(
    State(state): State<Arc<AppState>>,
    Path(day): Path<i64>,
    headers: HeaderMap,
    Json(input): Json<SplitDayInput>,
) -> StatusCode {
    if !is_authorized(&headers, &state.token) {
        return StatusCode::UNAUTHORIZED;
    }
    if !(0..=6).contains(&day) {
        return StatusCode::BAD_REQUEST;
    }
    let conn = state.db.lock().unwrap();
    let exercises_json = serde_json::to_string(&input.exercises).unwrap();
    conn.execute(
        "INSERT INTO splits (day, focus, exercises, rest) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(day) DO UPDATE SET focus = excluded.focus, exercises = excluded.exercises, rest = excluded.rest",
        params![day, input.focus, exercises_json, input.rest as i64],
    )
    .unwrap();
    StatusCode::NO_CONTENT
}

async fn get_attendance(State(state): State<Arc<AppState>>) -> Json<Vec<AttendanceEntry>> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT date FROM attendance ORDER BY date DESC LIMIT 400")
        .unwrap();
    let rows = stmt
        .query_map([], |r| Ok(AttendanceEntry { date: r.get(0)? }))
        .unwrap();
    Json(rows.filter_map(Result::ok).collect())
}

async fn post_attendance(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(input): Json<AttendanceInput>,
) -> StatusCode {
    if !is_authorized(&headers, &state.token) {
        return StatusCode::UNAUTHORIZED;
    }
    if input.date.len() != 10 {
        return StatusCode::BAD_REQUEST;
    }
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT OR IGNORE INTO attendance (date) VALUES (?1)",
        params![input.date],
    )
    .unwrap();
    StatusCode::NO_CONTENT
}

async fn healthz() -> &'static str {
    "ok"
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let db_path = std::env::var("GYM_DB_PATH").unwrap_or_else(|_| "gym.sqlite3".to_string());
    let token = std::env::var("GYM_TOKEN").unwrap_or_else(|_| {
        tracing::warn!("GYM_TOKEN not set — writes will be rejected until it is");
        String::new()
    });
    let allowed_origin = std::env::var("GYM_ALLOWED_ORIGIN")
        .unwrap_or_else(|_| "https://piyush-jena.github.io".to_string());

    let state = Arc::new(AppState {
        db: Mutex::new(open_db(&db_path)),
        token,
    });

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(HeaderValue::from_str(&allowed_origin).unwrap()))
        .allow_methods([Method::GET, Method::POST, Method::PUT])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .route("/healthz", get(healthz))
        .route("/api/splits", get(get_splits))
        .route("/api/splits/:day", put(put_split))
        .route("/api/attendance", get(get_attendance).post(post_attendance))
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8787);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("gym-server listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
