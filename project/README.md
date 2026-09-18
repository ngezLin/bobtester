# BobTester Automation Project

A modular, DRY automation testing suite built with the **BobTester Framework** and **Browserless**.

---

## 📁 Project Structure

```
project/
├── bobtester.config.json    # Cloud browser & test settings
├── data/
│   └── datasets.json        # Test datasets (e.g. "lalala1", "lalala_glitch")
├── utils/
│   ├── common.js            # Shared actions (login, logout, auth)
│   └── something.js         # Business feature modules (cart, catalog)
├── test1/
│   └── main.js              # Test Scenario 1 (Login -> Add Item -> Screenshot -> Logout)
├── test2/
│   └── main.js              # Test Scenario 2 (Performance user -> Add Item -> Verify Cart -> Logout)
└── screenshots/             # Auto-captured step screenshots
```

---

## 🚀 How to Run in Any IDE (VS Code, Cursor, WebStorm)

### 1. Run a Specific Test Directly with Node:
```bash
node test1/main.js
```
or
```bash
node test2/main.js
```

### 2. Run via the BobTester CLI:
```bash
npx bob run test1
```
or run all test suites in batch:
```bash
npx bob run --all
```

---

## 🏷️ How Data Sets Work

In `data/datasets.json`:
```json
{
  "lalala1": {
    "targetUrl": "https://www.saucedemo.com",
    "username": "standard_user",
    "password": "secret_sauce"
  }
}
```

In `utils/common.js`:
```javascript
const { bob } = require('bobtester');

const common = {
  async login(datasetName = 'lalala1') {
    // 1. Activate the dataset
    bob.useDataset(datasetName);

    // 2. Variables like [username] and [password] are automatically replaced!
    await bob.goto(bob.get('targetUrl'));
    await bob.fill('#user-name', '[username]');
    await bob.fill('#password', '[password]');
    await bob.click('#login-button');
  }
};
```

In `test1/main.js`:
```javascript
const { bob } = require('bobtester');
const common = require('../utils/common');

bob.run(async () => {
  await common.login('lalala1');
  await common.logout();
});
```
