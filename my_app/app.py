import os
import sqlite3
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder=".")

STAFF_USERNAME = "supercoolinterviewers6767"
STAFF_PASSWORD = "wearetherealwsdprom6767"
DB_FILE = os.path.join(os.path.dirname(__file__), "database.db")

def get_db():
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS interviews (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                cls TEXT NOT NULL,
                role TEXT NOT NULL,
                day TEXT NOT NULL,
                start TEXT NOT NULL,
                end TEXT NOT NULL,
                UNIQUE(day, start)
            )
        """)
        conn.commit()

init_db()


@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/staff.html")
def staff_page():
    return send_from_directory(".", "staff.html")

@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


@app.route("/api/interviews", methods=["GET"])
def get_interviews():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM interviews").fetchall()
        return jsonify([dict(row) for row in rows])

@app.route("/api/interviews", methods=["POST"])
def save_interview():
    data = request.json or {}
    required = ["id", "name", "cls", "role", "day", "start", "end"]
    if not all(k in data and data[k] for k in required):
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    user_id = data["id"]
    day = data["day"]
    start = data["start"]

    with get_db() as conn:
        existing_slot = conn.execute(
            "SELECT id FROM interviews WHERE day = ? AND start = ? AND id != ?",
            (day, start, user_id)
        ).fetchone()

        if existing_slot:
            return jsonify({"status": "error", "message": "This time slot is already taken! Please pick another."}), 409

        conn.execute("DELETE FROM interviews WHERE id = ?", (user_id,))
        
        try:
            conn.execute("""
                INSERT INTO interviews (id, name, cls, role, day, start, end)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, data["name"], data["cls"], data["role"], day, start, data["end"]))
            conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({"status": "error", "message": "This time slot was just taken by someone else!"}), 409

    return jsonify({"status": "success"})

@app.route("/api/staff/login", methods=["POST"])
def staff_login():
    data = request.json or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))

    if username == STAFF_USERNAME and password == STAFF_PASSWORD:
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM interviews").fetchall()
            return jsonify({
                "status": "success",
                "applicants": [dict(row) for row in rows]
            })
    return jsonify({"status": "error", "message": "Invalid username or password"}), 401

@app.route("/api/interviews/<user_id>", methods=["DELETE"])
def delete_interview(user_id):
    with get_db() as conn:
        conn.execute("DELETE FROM interviews WHERE id = ?", (user_id,))
        conn.commit()
    return jsonify({"status": "deleted"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Server starting on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=True)