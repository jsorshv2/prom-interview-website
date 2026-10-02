import sqlite3
import os

db_path = "database.db"

if not os.path.exists(db_path):
    print(f"File '{db_path}' does not exist yet. Run 'python app.py' first!")
else:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n--- ALL APPLICANTS / INTERVIEWS ---")
    rows = cursor.execute("SELECT * FROM interviews").fetchall()
    if not rows:
        print("No interviews booked yet.")
    else:
        for r in rows:
            print(f"ID: {r['id']} | Name: {r['name']} | Class: {r['cls']} | Role: {r['role']} | Slot: {r['day']} ({r['start']} - {r['end']})")

    conn.close()