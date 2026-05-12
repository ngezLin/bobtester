# Data Schemas (JSON)

## 1. Test Case Steps
The `steps` field in `test_cases` is an array of action objects.
```json
[
  { "action": "goto", "url": "https://example.com" },
  { "action": "fill", "selector": "#username", "value": "[username]" },
  { "action": "fill", "selector": "#password", "value": "[password]" },
  { "action": "click", "selector": "button[type='submit']" },
  { "action": "wait", "selector": ".welcome-msg" }
]
```

## 2. Test Assets (Payloads)
The `data` field in `test_assets` contains key-value pairs for variable replacement.
```json
{
  "name": "SQLi Probe #1",
  "vulnerability_type": "SQLi",
  "data": {
    "username": "admin' --",
    "password": "any"
  }
}
```

## 3. Test Runs (Results)
The `logs` and `vulnerabilities` fields in `test_runs`.
```json
{
  "status": "VULNERABLE",
  "execution_time": 4500,
  "vulnerabilities": [
    {
      "type": "XSS",
      "severity": "HIGH",
      "evidence": "Alert dialog detected with content: 'XSS'",
      "step_index": 2
    }
  ],
  "logs": [
    { "timestamp": "...", "level": "info", "message": "Navigating to..." },
    { "timestamp": "...", "level": "warn", "message": "Dialog detected!" }
  ]
}
```
