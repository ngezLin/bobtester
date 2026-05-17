-- QA Automation Platform Schema (Supabase/PostgreSQL)

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS findings;
DROP TABLE IF EXISTS scans;
DROP TABLE IF EXISTS targets;
DROP TABLE IF EXISTS test_runs;
DROP TABLE IF EXISTS test_assets;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

CREATE TYPE test_run_status AS ENUM (
    'passed',
    'failed',
    'running',
    'vulnerable',
    'warning',
    'safe'
);

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Cases table
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    project_id INT,
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    steps JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Test Assets table
CREATE TABLE test_assets (
    id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    is_negative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_assets_case
        FOREIGN KEY (case_id)
        REFERENCES test_cases(id)
        ON DELETE CASCADE
);

-- Test Runs table
CREATE TABLE test_runs (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    case_id INT NOT NULL,
    asset_id INT,

    status test_run_status DEFAULT 'running',

    execution_time INT,
    screenshot_path VARCHAR(255),

    logs JSONB,
    vulnerabilities JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_test_runs_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_test_runs_case
        FOREIGN KEY (case_id)
        REFERENCES test_cases(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_test_runs_asset
        FOREIGN KEY (asset_id)
        REFERENCES test_assets(id)
        ON DELETE SET NULL
);

-- Targets table
CREATE TABLE targets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE scan_status AS ENUM (
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE scan_type AS ENUM (
  'FULL',
  'QUICK',
  'CUSTOM'
);

CREATE TYPE severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE finding_category AS ENUM (
  'AUTH',
  'CONFIG',
  'INJECTION',
  'INFO',
  'OTHER'
);

CREATE TYPE confidence AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

-- SCANS

CREATE TABLE scans (
  id TEXT PRIMARY KEY,

  project_id BIGINT
    REFERENCES projects(id)
    ON DELETE CASCADE,

  target_id BIGINT
    REFERENCES targets(id)
    ON DELETE CASCADE,

  name TEXT,

  target_url TEXT,

  status scan_status NOT NULL DEFAULT 'QUEUED',

  type scan_type NOT NULL DEFAULT 'FULL',

  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100),

  summary TEXT,

  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FINDINGS

CREATE TABLE findings (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  scan_id TEXT NOT NULL
    REFERENCES scans(id)
    ON DELETE CASCADE,

  title TEXT NOT NULL,

  description TEXT NOT NULL,

  severity severity NOT NULL,

  category finding_category NOT NULL,

  vector TEXT,

  evidence JSONB,

  confidence confidence NOT NULL DEFAULT 'MEDIUM',

  remediation TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REPORTS

CREATE TABLE reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  scan_id TEXT NOT NULL UNIQUE
    REFERENCES scans(id)
    ON DELETE CASCADE,

  summary TEXT NOT NULL,

  ai_summary TEXT,

  recommendations JSONB,

  counts JSONB NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE test_cases ADD COLUMN folder VARCHAR(255) DEFAULT 'General';