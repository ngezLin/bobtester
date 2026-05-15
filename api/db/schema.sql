-- QA Automation Platform Schema (Supabase/PostgreSQL)

-- Drop tables in reverse order of dependencies
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