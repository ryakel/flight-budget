# tail-lookup Development Session

A lightweight, self-hosted API for FAA aircraft registration lookup by N-number.

## Project Structure

```
tail-lookup/
├── .github/
│   └── workflows/
│       ├── nightly-build.yml
│       └── build.yml
├── app/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   └── static/
│       └── index.html
├── scripts/
│   └── update_faa_data.py
├── data/
│   └── .gitkeep
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .gitignore
├── .dockerignore
└── README.md
```

---

## File: `requirements.txt`

```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
pydantic==2.10.4
httpx==0.28.1
```

---

## File: `.gitignore`

```text
# Database
*.db
data/*
!data/.gitkeep

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
.env

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# FAA downloads
*.zip
MASTER.txt
ACFTREF.txt
```

---

## File: `.dockerignore`

```text
.git
.github
.gitignore
.dockerignore
*.md
*.sh
.venv
venv
__pycache__
*.pyc
.env
.DS_Store
```

---

## File: `Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY data/aircraft.db ./data/aircraft.db

ENV PYTHONPATH=/app/app
ENV DB_PATH=/app/data/aircraft.db

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8080/api/v1/health').raise_for_status()"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## File: `docker-compose.yml`

```yaml
version: "3.8"

services:
  tail-lookup:
    image: ryakel/tail-lookup:latest
    container_name: tail-lookup
    ports:
      - "8182:8080"
    restart: unless-stopped
```

---

## File: `app/models.py`

```python
"""Pydantic models for tail-lookup API responses."""
from typing import Optional, List
from pydantic import BaseModel, Field


class AircraftResponse(BaseModel):
    """Aircraft registration lookup response."""
    tail_number: str
    manufacturer: str
    model: str
    series: Optional[str] = None
    aircraft_type: str
    engine_type: str
    num_engines: Optional[int] = None
    num_seats: Optional[int] = None
    year_mfr: Optional[int] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "tail_number": "N172SP",
                "manufacturer": "CESSNA",
                "model": "172S",
                "series": "SKYHAWK SP",
                "aircraft_type": "Fixed Wing Single-Engine",
                "engine_type": "Reciprocating",
                "num_engines": 1,
                "num_seats": 4,
                "year_mfr": 2001
            }
        }
    }


class BulkRequest(BaseModel):
    """Bulk lookup request."""
    tail_numbers: List[str] = Field(..., max_length=50)

    model_config = {
        "json_schema_extra": {
            "example": {
                "tail_numbers": ["N172SP", "N12345", "N67890"]
            }
        }
    }


class BulkResult(BaseModel):
    """Single result within bulk response."""
    tail_number: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    series: Optional[str] = None
    aircraft_type: Optional[str] = None
    engine_type: Optional[str] = None
    num_engines: Optional[int] = None
    num_seats: Optional[int] = None
    year_mfr: Optional[int] = None
    error: Optional[str] = None


class BulkResponse(BaseModel):
    """Bulk lookup response."""
    total: int
    found: int
    results: List[BulkResult]

    model_config = {
        "json_schema_extra": {
            "example": {
                "total": 3,
                "found": 2,
                "results": [
                    {
                        "tail_number": "N172SP",
                        "manufacturer": "CESSNA",
                        "model": "172S",
                        "aircraft_type": "Fixed Wing Single-Engine",
                        "engine_type": "Reciprocating"
                    },
                    {
                        "tail_number": "N99999",
                        "error": "Not found"
                    }
                ]
            }
        }
    }


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    database_exists: bool
    record_count: int
    last_updated: Optional[str] = None


class StatsResponse(BaseModel):
    """Database statistics response."""
    record_count: int
    last_updated: Optional[str] = None
```

---

## File: `app/database.py`

```python
"""SQLite database operations for tail-lookup."""
import sqlite3
from typing import Optional
from models import AircraftResponse, StatsResponse

AIRCRAFT_TYPES = {
    "1": "Glider",
    "2": "Balloon",
    "3": "Blimp/Dirigible", 
    "4": "Fixed Wing Single-Engine",
    "5": "Fixed Wing Multi-Engine",
    "6": "Rotorcraft",
    "7": "Weight-Shift-Control",
    "8": "Powered Parachute",
    "9": "Gyroplane",
    "H": "Hybrid Lift",
    "O": "Other"
}

ENGINE_TYPES = {
    "0": "None",
    "1": "Reciprocating",
    "2": "Turbo-Prop",
    "3": "Turbo-Shaft",
    "4": "Turbo-Jet",
    "5": "Turbo-Fan",
    "6": "Ramjet",
    "7": "2-Cycle",
    "8": "4-Cycle",
    "9": "Unknown",
    "10": "Electric",
    "11": "Rotary"
}


class Database:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
    
    def close(self):
        self.conn.close()
    
    def lookup(self, n_number: str) -> Optional[AircraftResponse]:
        """Lookup aircraft by N-number (without 'N' prefix)."""
        cursor = self.conn.execute("""
            SELECT 
                m.n_number,
                m.mfr_mdl_code,
                m.type_aircraft,
                m.type_engine,
                m.no_eng,
                m.no_seats,
                m.year_mfr,
                a.mfr AS manufacturer,
                a.model,
                a.series
            FROM master m
            LEFT JOIN acftref a ON m.mfr_mdl_code = a.code
            WHERE m.n_number = ?
        """, (n_number,))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        return AircraftResponse(
            tail_number=f"N{row['n_number']}",
            manufacturer=row["manufacturer"] or "Unknown",
            model=row["model"] or "Unknown",
            series=row["series"] or None,
            aircraft_type=AIRCRAFT_TYPES.get(str(row["type_aircraft"]), "Unknown"),
            engine_type=ENGINE_TYPES.get(str(row["type_engine"]), "Unknown"),
            num_engines=int(row["no_eng"]) if row["no_eng"] else None,
            num_seats=int(row["no_seats"]) if row["no_seats"] else None,
            year_mfr=int(row["year_mfr"]) if row["year_mfr"] else None
        )
    
    def get_stats(self) -> StatsResponse:
        """Get database statistics."""
        cursor = self.conn.execute("SELECT COUNT(*) as cnt FROM master")
        count = cursor.fetchone()["cnt"]
        
        cursor = self.conn.execute(
            "SELECT value FROM metadata WHERE key = 'last_updated'"
        )
        row = cursor.fetchone()
        last_updated = row["value"] if row else None
        
        return StatsResponse(record_count=count, last_updated=last_updated)
```

---

## File: `app/main.py`

```python
"""tail-lookup: FAA Aircraft Registration Lookup API"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List

from database import Database
from models import AircraftResponse, HealthResponse, StatsResponse, BulkRequest, BulkResponse, BulkResult

DB_PATH = os.getenv("DB_PATH", "/app/data/aircraft.db")
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

db: Database = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db
    if not os.path.exists(DB_PATH):
        raise RuntimeError(f"Database not found at {DB_PATH}")
    db = Database(DB_PATH)
    yield
    db.close()


app = FastAPI(
    title="tail-lookup",
    description="FAA Aircraft Registration Lookup API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def normalize_tail(tail: str) -> str:
    """Normalize N-number: uppercase, strip N prefix and dashes."""
    t = tail.upper().strip()
    if t.startswith("N"):
        t = t[1:]
    return t.replace("-", "").replace(" ", "")


@app.get("/", include_in_schema=False)
async def root():
    """Serve the UI."""
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/api/v1/aircraft/{tail}", response_model=AircraftResponse)
async def get_aircraft(tail: str):
    """Lookup aircraft by N-number (e.g., N172SP, 172SP, N-172SP)."""
    normalized = normalize_tail(tail)
    if not normalized:
        raise HTTPException(400, "Invalid tail number")
    
    aircraft = db.lookup(normalized)
    if not aircraft:
        raise HTTPException(404, f"Aircraft N{normalized} not found")
    
    return aircraft


@app.post("/api/v1/aircraft/bulk", response_model=BulkResponse)
async def bulk_lookup(request: BulkRequest):
    """Lookup multiple aircraft by N-number. Maximum 50 per request."""
    if len(request.tail_numbers) > 50:
        raise HTTPException(400, "Maximum 50 tail numbers per request")
    
    results: List[BulkResult] = []
    found = 0
    
    for tail in request.tail_numbers:
        normalized = normalize_tail(tail)
        if not normalized:
            results.append(BulkResult(
                tail_number=tail.upper(),
                error="Invalid tail number"
            ))
            continue
        
        aircraft = db.lookup(normalized)
        if aircraft:
            found += 1
            results.append(BulkResult(
                tail_number=aircraft.tail_number,
                manufacturer=aircraft.manufacturer,
                model=aircraft.model,
                series=aircraft.series,
                aircraft_type=aircraft.aircraft_type,
                engine_type=aircraft.engine_type,
                num_engines=aircraft.num_engines,
                num_seats=aircraft.num_seats,
                year_mfr=aircraft.year_mfr
            ))
        else:
            results.append(BulkResult(
                tail_number=f"N{normalized}",
                error="Not found"
            ))
    
    return BulkResponse(
        total=len(request.tail_numbers),
        found=found,
        results=results
    )


@app.get("/api/v1/health", response_model=HealthResponse)
async def health():
    """Health check with database status."""
    stats = db.get_stats()
    return HealthResponse(
        status="healthy" if stats.record_count > 0 else "degraded",
        database_exists=os.path.exists(DB_PATH),
        record_count=stats.record_count,
        last_updated=stats.last_updated
    )


@app.get("/api/v1/stats", response_model=StatsResponse)
async def stats():
    """Database statistics."""
    return db.get_stats()
```

---

## File: `app/static/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>tail-lookup</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
    }
    h1 { color: #38bdf8; margin-bottom: 0.5rem; }
    .subtitle { color: #64748b; margin-bottom: 2rem; }
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .tab {
      padding: 0.5rem 1rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab:hover { border-color: #38bdf8; }
    .tab.active { background: #38bdf8; color: #0f172a; border-color: #38bdf8; }
    .panel { display: none; }
    .panel.active { display: block; }
    .input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    input, textarea {
      flex: 1;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border: 1px solid #334155;
      border-radius: 6px;
      background: #1e293b;
      color: #e2e8f0;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #38bdf8;
    }
    textarea {
      min-height: 120px;
      font-family: monospace;
      resize: vertical;
    }
    button {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      background: #38bdf8;
      color: #0f172a;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s;
    }
    button:hover { background: #0ea5e9; }
    button:disabled { background: #475569; cursor: not-allowed; }
    .hint { font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
    .results {
      background: #1e293b;
      border-radius: 8px;
      padding: 1rem;
      margin-top: 1rem;
    }
    .result-card {
      background: #0f172a;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 0.75rem;
    }
    .result-card:last-child { margin-bottom: 0; }
    .result-card.error { border-left: 3px solid #ef4444; }
    .result-card.success { border-left: 3px solid #22c55e; }
    .tail { font-size: 1.25rem; font-weight: 700; color: #38bdf8; }
    .aircraft-info { color: #e2e8f0; margin: 0.5rem 0; }
    .meta { font-size: 0.875rem; color: #64748b; }
    .error-msg { color: #ef4444; }
    .stats {
      display: flex;
      gap: 2rem;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #334155;
      font-size: 0.875rem;
      color: #64748b;
    }
    .stat-value { color: #38bdf8; font-weight: 600; }
    .loading { opacity: 0.6; }
    @media (max-width: 600px) {
      .input-group { flex-direction: column; }
      button { width: 100%; }
    }
  </style>
</head>
<body>
  <h1>✈️ tail-lookup</h1>
  <p class="subtitle">FAA Aircraft Registration Lookup</p>

  <div class="tabs">
    <div class="tab active" data-tab="single">Single Lookup</div>
    <div class="tab" data-tab="bulk">Bulk Lookup</div>
  </div>

  <div id="single" class="panel active">
    <div class="input-group">
      <input type="text" id="tailInput" placeholder="Enter N-number (e.g., N172SP)" autocomplete="off">
      <button id="lookupBtn">Lookup</button>
    </div>
    <p class="hint">Formats accepted: N172SP, 172SP, N-172SP</p>
    <div id="singleResults"></div>
  </div>

  <div id="bulk" class="panel">
    <textarea id="bulkInput" placeholder="Enter N-numbers, one per line:&#10;N172SP&#10;N12345&#10;N67890"></textarea>
    <div class="input-group" style="margin-top: 0.5rem;">
      <button id="bulkBtn">Lookup All</button>
    </div>
    <p class="hint">Maximum 50 tail numbers per request</p>
    <div id="bulkResults"></div>
  </div>

  <div class="stats">
    <div>Records: <span id="recordCount" class="stat-value">—</span></div>
    <div>Last Updated: <span id="lastUpdated" class="stat-value">—</span></div>
  </div>

  <script>
    const API = '/api/v1';

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
      });
    });

    // Single lookup
    const tailInput = document.getElementById('tailInput');
    const lookupBtn = document.getElementById('lookupBtn');
    const singleResults = document.getElementById('singleResults');

    async function singleLookup() {
      const tail = tailInput.value.trim();
      if (!tail) return;
      
      lookupBtn.disabled = true;
      lookupBtn.textContent = 'Looking up...';
      
      try {
        const res = await fetch(`${API}/aircraft/${encodeURIComponent(tail)}`);
        const data = await res.json();
        
        if (res.ok) {
          singleResults.innerHTML = renderCard(data);
        } else {
          singleResults.innerHTML = renderError(tail, data.detail || 'Not found');
        }
      } catch (err) {
        singleResults.innerHTML = renderError(tail, 'Network error');
      } finally {
        lookupBtn.disabled = false;
        lookupBtn.textContent = 'Lookup';
      }
    }

    lookupBtn.addEventListener('click', singleLookup);
    tailInput.addEventListener('keypress', e => { if (e.key === 'Enter') singleLookup(); });

    // Bulk lookup
    const bulkInput = document.getElementById('bulkInput');
    const bulkBtn = document.getElementById('bulkBtn');
    const bulkResults = document.getElementById('bulkResults');

    async function bulkLookup() {
      const tails = bulkInput.value.split('\n').map(t => t.trim()).filter(Boolean);
      if (!tails.length) return;
      
      bulkBtn.disabled = true;
      bulkBtn.textContent = `Looking up ${tails.length}...`;
      
      try {
        const res = await fetch(`${API}/aircraft/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tail_numbers: tails.slice(0, 50) })
        });
        const data = await res.json();
        
        let html = '<div class="results">';
        for (const result of data.results) {
          if (result.error) {
            html += renderError(result.tail_number, result.error);
          } else {
            html += renderCard(result);
          }
        }
        html += `</div><p class="hint" style="margin-top:1rem">Found: ${data.found}/${data.total}</p>`;
        bulkResults.innerHTML = html;
      } catch (err) {
        bulkResults.innerHTML = renderError('Bulk', 'Network error');
      } finally {
        bulkBtn.disabled = false;
        bulkBtn.textContent = 'Lookup All';
      }
    }

    bulkBtn.addEventListener('click', bulkLookup);

    // Render helpers
    function renderCard(a) {
      return `
        <div class="result-card success">
          <div class="tail">${a.tail_number}</div>
          <div class="aircraft-info">${a.manufacturer} ${a.model}${a.series ? ' ' + a.series : ''}</div>
          <div class="meta">
            ${a.aircraft_type} · ${a.engine_type} · 
            ${a.num_engines || '?'} engine${a.num_engines !== 1 ? 's' : ''} · 
            ${a.num_seats || '?'} seats · 
            ${a.year_mfr || 'Year unknown'}
          </div>
        </div>`;
    }

    function renderError(tail, msg) {
      return `
        <div class="result-card error">
          <div class="tail">${tail.toUpperCase().startsWith('N') ? tail.toUpperCase() : 'N' + tail.toUpperCase()}</div>
          <div class="error-msg">${msg}</div>
        </div>`;
    }

    // Load stats
    fetch(`${API}/stats`)
      .then(r => r.json())
      .then(data => {
        document.getElementById('recordCount').textContent = data.record_count?.toLocaleString() || '—';
        document.getElementById('lastUpdated').textContent = data.last_updated?.split('T')[0] || '—';
      })
      .catch(() => {});
  </script>
</body>
</html>
```

---

## File: `scripts/update_faa_data.py`

```python
#!/usr/bin/env python3
"""
Download FAA aircraft registration data and build SQLite database.

Usage:
    python update_faa_data.py [output_path]
    
Default output: ./aircraft.db
"""
import csv
import io
import os
import sqlite3
import sys
import zipfile
from datetime import datetime, timezone
from urllib.request import urlopen

FAA_URL = "https://registry.faa.gov/database/ReleasableAircraft.zip"

# Columns we need from MASTER.txt
MASTER_COLS = [
    "N-NUMBER", "SERIAL NUMBER", "MFR MDL CODE", "ENG MFR MDL", "YEAR MFR",
    "TYPE REGISTRANT", "NAME", "STREET", "STREET2", "CITY", "STATE", "ZIP CODE",
    "REGION", "COUNTY", "COUNTRY", "LAST ACTION DATE", "CERT ISSUE DATE",
    "CERTIFICATION", "TYPE AIRCRAFT", "TYPE ENGINE", "STATUS CODE", "MODE S CODE",
    "FRACT OWNER", "AIR WORTH DATE", "OTHER NAMES(1)", "OTHER NAMES(2)",
    "OTHER NAMES(3)", "OTHER NAMES(4)", "OTHER NAMES(5)", "EXPIRATION DATE",
    "UNIQUE ID", "KIT MFR", "KIT MODEL", "MODE S CODE HEX", "X35"
]

# Columns we need from ACFTREF.txt
ACFTREF_COLS = ["CODE", "MFR", "MODEL", "TYPE-ACFT", "TYPE-ENG", "AC-CAT",
                "BUILD-CERT-IND", "NO-ENG", "NO-SEATS", "AC-WEIGHT", "SPEED", "TC-DATA-SHEET", "TC-DATA-HOLDER"]


def download_faa_data() -> zipfile.ZipFile:
    """Download FAA database ZIP file."""
    print(f"Downloading {FAA_URL}...")
    with urlopen(FAA_URL, timeout=120) as resp:
        data = resp.read()
    print(f"Downloaded {len(data) / 1e6:.1f} MB")
    return zipfile.ZipFile(io.BytesIO(data))


def parse_csv(zf: zipfile.ZipFile, filename: str, expected_cols: list) -> list[dict]:
    """Parse a CSV file from the ZIP archive."""
    print(f"Parsing {filename}...")
    with zf.open(filename) as f:
        # FAA files are UTF-8 with some Latin-1 characters
        text = io.TextIOWrapper(f, encoding="utf-8", errors="replace")
        reader = csv.reader(text)
        header = [col.strip() for col in next(reader)]
        
        # Map expected columns to actual positions
        col_map = {}
        for col in expected_cols:
            if col in header:
                col_map[col] = header.index(col)
        
        rows = []
        for row in reader:
            record = {}
            for col, idx in col_map.items():
                if idx < len(row):
                    record[col] = row[idx].strip()
                else:
                    record[col] = ""
            rows.append(record)
    
    print(f"  Parsed {len(rows):,} records")
    return rows


def build_database(master_rows: list, acftref_rows: list, output_path: str):
    """Build SQLite database from parsed data."""
    print(f"Building database at {output_path}...")
    
    if os.path.exists(output_path):
        os.remove(output_path)
    
    conn = sqlite3.connect(output_path)
    cur = conn.cursor()
    
    # Create tables
    cur.execute("""
        CREATE TABLE master (
            n_number TEXT PRIMARY KEY,
            mfr_mdl_code TEXT,
            type_aircraft TEXT,
            type_engine TEXT,
            no_eng TEXT,
            no_seats TEXT,
            year_mfr TEXT
        )
    """)
    
    cur.execute("""
        CREATE TABLE acftref (
            code TEXT PRIMARY KEY,
            mfr TEXT,
            model TEXT,
            series TEXT,
            no_eng TEXT,
            no_seats TEXT
        )
    """)
    
    cur.execute("""
        CREATE TABLE metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # Insert ACFTREF data (need this for JOIN)
    acftref_data = [
        (
            row.get("CODE", ""),
            row.get("MFR", ""),
            row.get("MODEL", ""),
            "",  # Series not in ACFTREF, derive from model name
            row.get("NO-ENG", ""),
            row.get("NO-SEATS", "")
        )
        for row in acftref_rows
        if row.get("CODE")
    ]
    cur.executemany(
        "INSERT OR IGNORE INTO acftref VALUES (?, ?, ?, ?, ?, ?)",
        acftref_data
    )
    print(f"  Inserted {len(acftref_data):,} aircraft reference records")
    
    # Insert MASTER data
    master_data = [
        (
            row.get("N-NUMBER", ""),
            row.get("MFR MDL CODE", ""),
            row.get("TYPE AIRCRAFT", ""),
            row.get("TYPE ENGINE", ""),
            row.get("NO-ENG", "") or row.get("ENG MFR MDL", "")[:1],  # Fallback
            row.get("NO-SEATS", ""),
            row.get("YEAR MFR", "")
        )
        for row in master_rows
        if row.get("N-NUMBER")
    ]
    cur.executemany(
        "INSERT OR IGNORE INTO master VALUES (?, ?, ?, ?, ?, ?, ?)",
        master_data
    )
    print(f"  Inserted {len(master_data):,} registration records")
    
    # Add metadata
    cur.execute(
        "INSERT INTO metadata VALUES (?, ?)",
        ("last_updated", datetime.now(timezone.utc).isoformat())
    )
    
    # Create index for faster lookups
    cur.execute("CREATE INDEX idx_mfr_mdl ON master(mfr_mdl_code)")
    
    conn.commit()
    conn.close()
    
    size_mb = os.path.getsize(output_path) / 1e6
    print(f"Database created: {output_path} ({size_mb:.1f} MB)")


def main():
    output_path = sys.argv[1] if len(sys.argv) > 1 else "./aircraft.db"
    
    zf = download_faa_data()
    
    # Find the actual filenames (they might have slight variations)
    files = zf.namelist()
    master_file = next((f for f in files if "MASTER" in f.upper()), None)
    acftref_file = next((f for f in files if "ACFTREF" in f.upper()), None)
    
    if not master_file or not acftref_file:
        print(f"Error: Could not find MASTER or ACFTREF in ZIP. Files: {files}")
        sys.exit(1)
    
    master_rows = parse_csv(zf, master_file, MASTER_COLS)
    acftref_rows = parse_csv(zf, acftref_file, ACFTREF_COLS)
    
    build_database(master_rows, acftref_rows, output_path)
    print("Done!")


if __name__ == "__main__":
    main()
```

---

## File: `.github/workflows/nightly-build.yml`

```yaml
name: Nightly Build

on:
  schedule:
    # Run daily at 6:00 AM UTC (after FAA's 11:30 PM CT update)
    - cron: '0 6 * * *'
  workflow_dispatch:  # Allow manual trigger

env:
  REGISTRY: docker.io
  IMAGE_NAME: ryakel/tail-lookup

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Download and build database
        run: |
          python scripts/update_faa_data.py data/aircraft.db

      - name: Get build info
        id: info
        run: |
          RECORDS=$(sqlite3 data/aircraft.db "SELECT COUNT(*) FROM master")
          SIZE=$(du -h data/aircraft.db | cut -f1)
          DATE=$(date -u +%Y-%m-%d)
          echo "records=$RECORDS" >> $GITHUB_OUTPUT
          echo "size=$SIZE" >> $GITHUB_OUTPUT
          echo "date=$DATE" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.IMAGE_NAME }}:latest
            ${{ env.IMAGE_NAME }}:${{ steps.info.outputs.date }}
          labels: |
            org.opencontainers.image.title=tail-lookup
            org.opencontainers.image.description=FAA Aircraft Registration Lookup API
            org.opencontainers.image.created=${{ steps.info.outputs.date }}
            org.opencontainers.image.source=https://github.com/ryakel/tail-lookup
            faa.data.records=${{ steps.info.outputs.records }}
            faa.data.date=${{ steps.info.outputs.date }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Update GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: data-${{ steps.info.outputs.date }}
          name: "FAA Data - ${{ steps.info.outputs.date }}"
          body: |
            ## FAA Aircraft Registration Database
            
            **Date:** ${{ steps.info.outputs.date }}
            **Records:** ${{ steps.info.outputs.records }}
            **DB Size:** ${{ steps.info.outputs.size }}
            
            **Docker Image:**
            ```
            docker pull ryakel/tail-lookup:${{ steps.info.outputs.date }}
            docker pull ryakel/tail-lookup:latest
            ```
            
            Source: [FAA Releasable Aircraft Database](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download)
          files: data/aircraft.db
          prerelease: false

      - name: Trigger Portainer webhook
        if: ${{ secrets.PORTAINER_WEBHOOK_URL != '' }}
        run: |
          curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}" || true

      - name: Summary
        run: |
          echo "## Build Complete 🎉" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Metric | Value |" >> $GITHUB_STEP_SUMMARY
          echo "|--------|-------|" >> $GITHUB_STEP_SUMMARY
          echo "| Date | ${{ steps.info.outputs.date }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Records | ${{ steps.info.outputs.records }} |" >> $GITHUB_STEP_SUMMARY
          echo "| DB Size | ${{ steps.info.outputs.size }} |" >> $GITHUB_STEP_SUMMARY
          echo "| Image | \`${{ env.IMAGE_NAME }}:${{ steps.info.outputs.date }}\` |" >> $GITHUB_STEP_SUMMARY
```

---

## File: `.github/workflows/build.yml`

```yaml
name: Build on Code Change

on:
  push:
    branches: [main]
    paths:
      - 'app/**'
      - 'Dockerfile'
      - 'requirements.txt'
  pull_request:
    branches: [main]

env:
  REGISTRY: docker.io
  IMAGE_NAME: ryakel/tail-lookup

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Download latest database from releases
        run: |
          mkdir -p data
          # Get latest release with aircraft.db
          DOWNLOAD_URL=$(curl -s https://api.github.com/repos/ryakel/tail-lookup/releases/latest \
            | jq -r '.assets[] | select(.name == "aircraft.db") | .browser_download_url')
          
          if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then
            echo "No existing database found, building fresh..."
            pip install -q requests
            python scripts/update_faa_data.py data/aircraft.db
          else
            echo "Downloading from $DOWNLOAD_URL"
            curl -L -o data/aircraft.db "$DOWNLOAD_URL"
          fi

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Get metadata
        id: meta
        run: |
          DATE=$(date -u +%Y-%m-%d)
          SHA=$(echo ${{ github.sha }} | cut -c1-7)
          echo "date=$DATE" >> $GITHUB_OUTPUT
          echo "sha=$SHA" >> $GITHUB_OUTPUT

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: |
            ${{ env.IMAGE_NAME }}:latest
            ${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.date }}-${{ steps.meta.outputs.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Trigger Portainer webhook
        if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        run: |
          if [ -n "${{ secrets.PORTAINER_WEBHOOK_URL }}" ]; then
            curl -X POST "${{ secrets.PORTAINER_WEBHOOK_URL }}" || true
          fi
```

---

## File: `README.md`

```markdown
# tail-lookup

Lightweight, self-hosted API for FAA aircraft registration lookup by N-number.

Database baked into image—just pull and run.

## Quick Start

```bash
docker run -d -p 8182:8080 ryakel/tail-lookup:latest
```

Open http://localhost:8182 for the web UI, or use the API directly:

```bash
curl http://localhost:8182/api/v1/aircraft/N172SP
```

## Features

- 🔍 Single and bulk lookups (up to 50 at once)
- 🌐 Simple web UI for testing
- 📦 ~25MB SQLite database with ~300k aircraft
- 🔄 Nightly automated updates via GitHub Actions
- 🐳 Zero-config Docker deployment

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web UI |
| `/api/v1/aircraft/{tail}` | GET | Single lookup |
| `/api/v1/aircraft/bulk` | POST | Bulk lookup (max 50) |
| `/api/v1/health` | GET | Health + data freshness |
| `/api/v1/stats` | GET | Record count, last update |
| `/docs` | GET | OpenAPI documentation |

### Single Lookup

```bash
curl http://localhost:8182/api/v1/aircraft/N172SP
```

```json
{
  "tail_number": "N172SP",
  "manufacturer": "CESSNA",
  "model": "172S",
  "series": "SKYHAWK SP",
  "aircraft_type": "Fixed Wing Single-Engine",
  "engine_type": "Reciprocating",
  "num_engines": 1,
  "num_seats": 4,
  "year_mfr": 2001
}
```

All formats accepted: `N172SP`, `172SP`, `N-172SP`, `n172sp`

### Bulk Lookup

```bash
curl -X POST http://localhost:8182/api/v1/aircraft/bulk \
  -H "Content-Type: application/json" \
  -d '{"tail_numbers": ["N172SP", "N12345", "N99999"]}'
```

```json
{
  "total": 3,
  "found": 2,
  "results": [
    {
      "tail_number": "N172SP",
      "manufacturer": "CESSNA",
      "model": "172S",
      ...
    },
    {
      "tail_number": "N12345",
      "manufacturer": "PIPER",
      ...
    },
    {
      "tail_number": "N99999",
      "error": "Not found"
    }
  ]
}
```

## Image Tags

| Tag | Description |
|-----|-------------|
| `:latest` | Most recent nightly build |
| `:2025-11-28` | Pin to specific date |

New images built daily at 6 AM UTC with fresh FAA data.

## Deploy with flight-budget

```yaml
version: "3.8"

services:
  flight-budget:
    image: ryakel/flight-budget:latest
    ports:
      - "8181:80"

  tail-lookup:
    image: ryakel/tail-lookup:latest
    ports:
      - "8182:8080"
```

## Development

```bash
# Clone
git clone https://github.com/ryakel/tail-lookup.git
cd tail-lookup

# Build database locally
python scripts/update_faa_data.py data/aircraft.db

# Run
pip install -r requirements.txt
DB_PATH=data/aircraft.db uvicorn app.main:app --reload --port 8080
```

## CI/CD

| Workflow | Trigger | Action |
|----------|---------|--------|
| `nightly-build.yml` | Daily 6 AM UTC | Fetch FAA data → Build DB → Push image |
| `build.yml` | Code changes | Rebuild image with latest DB |

### Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `DOCKERHUB_USERNAME` | Yes | Docker Hub username |
| `DOCKERHUB_TOKEN` | Yes | Docker Hub access token |
| `PORTAINER_WEBHOOK_URL` | No | Auto-redeploy webhook |

## Data Source

Aircraft data from [FAA Releasable Aircraft Database](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download), updated daily at 11:30 PM CT.

## License

MIT

## Credits

- Inspired by [Aircraft-Registration-Lookup-API](https://github.com/njfdev/Aircraft-Registration-Lookup-API)
- Data: [FAA Aircraft Registry](https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry)
```

---

## File: `data/.gitkeep`

```
```

---

## Setup Instructions

1. Create the directory structure:
   ```bash
   mkdir -p tail-lookup/{app/static,scripts,data,.github/workflows}
   cd tail-lookup
   touch data/.gitkeep
   ```

2. Copy each file from this document to its location

3. Initialize and push:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   gh repo create tail-lookup --public --source=. --push
   ```

4. Set secrets:
   ```bash
   gh secret set DOCKERHUB_USERNAME
   gh secret set DOCKERHUB_TOKEN
   gh secret set PORTAINER_WEBHOOK_URL  # optional
   ```

5. Trigger first build:
   ```bash
   gh workflow run nightly-build.yml
   ```

6. Once complete, run:
   ```bash
   docker run -d -p 8182:8080 ryakel/tail-lookup:latest
   open http://localhost:8182
   ```
