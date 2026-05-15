CREATE DATABASE IF NOT EXISTS bobtester;
USE bobtester;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS test_runs;
DROP TABLE IF EXISTS test_assets;
DROP TABLE IF EXISTS test_cases;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Test Cases table
CREATE TABLE test_cases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    project_id INT,
    name VARCHAR(255) NOT NULL,
    target_url TEXT NOT NULL,
    steps JSON NOT NULL, -- Format: [{action: 'goto'|'fill'|'click', selector?: string, value?: string}]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Test Assets table
CREATE TABLE test_assets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    data JSON NOT NULL, -- Format: { "fieldName": "value" }
    is_negative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE CASCADE
);

-- Test Runs table (Simplified with logs and screenshot path)
CREATE TABLE test_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    case_id INT NOT NULL,
    asset_id INT,
    status ENUM('passed', 'failed', 'running', 'vulnerable', 'warning', 'safe') DEFAULT 'running',
    execution_time INT COMMENT 'Execution time in milliseconds',
    screenshot_path VARCHAR(255),
    logs JSON, -- Store execution logs as JSON array
    vulnerabilities JSON, -- Store security findings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (case_id) REFERENCES test_cases(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES test_assets(id) ON DELETE SET NULL
);
