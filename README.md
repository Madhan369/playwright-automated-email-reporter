# Playwright Automatic Email Reporter 📧🎭

[![Playwright](https://img.shields.io/badge/Playwright-Test%20Automation-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Nodemailer](https://img.shields.io/badge/Email-Nodemailer-EA4335?logo=gmail&logoColor=white)](https://nodemailer.com/)

A Playwright test automation framework centered on **Automatic Email Reporting**. Upon test execution completion, the custom reporter compresses the generated **Playwright HTML report** into a `.zip` archive and immediately emails it to stakeholders using **Nodemailer**.

> **Note on Report Flexibility:** While this project is configured out-of-the-box for the **Playwright HTML report**, the exact same approach and workflow can be easily adapted to send **Allure reports**, **Custom HTML reports**, **Mochawesome**, or any other test artifacts.

---

## 🔄 Execution Workflow

```text
npx playwright test
        ↓
   Tests execute
        ↓
playwright-report generated
        ↓
 Report ZIP created
        ↓
Email sent automatically
```

---

## 💡 Why This Project?

By default, Playwright generates rich HTML reports locally or within CI pipeline artifacts. However, in real-world QA and DevOps workflows:
- Stakeholders, managers, and team members need instant execution updates without logging into CI servers or checking local terminal logs.
- Sharing reports often requires manually locating, zipping, and emailing test folders.

**This project solves that problem** by providing an end-to-end automated email reporting mechanism: as soon as the test run finishes (whether passed or failed), the HTML report folder is automatically zipped and dispatched to your target recipients.

---

## 🌟 Features

- **Automated Email Dispatch**: Emails test results immediately after suite execution without manual intervention.
- **Configured for Playwright HTML Report**: Automatically packages the native Playwright HTML report folder (`playwright-report/`).
- **Extensible to Other Reporters**: Adaptable to **Allure report**, custom dashboard reports, or test evidence folders simply by changing the target directory path.
- **Auto-Zipping Artifacts**: Compresses the target report directory into a lightweight `.zip` attachment using high compression (`zlib` level 9).
- **Dynamic Status Subject Line**: Clearly displays execution status (`PASSED`, `FAILED`, `TIMEDOUT`) directly in the email subject and body.
- **Real-Time Execution Metrics & Metadata**: Tracks tests via `onTestEnd` and injects details directly into the email body:
  - Counts: Total Tests, Passed ✅, Failed ❌, Skipped/Flaky ⚠️, and Duration ⏱️
  - Metadata: Executed At timestamp, Environment (`Local` vs `CI / GitHub Actions`), and Browsers Run
- **25 MB Attachment Safety Guard**: Checks ZIP file size before sending; if it exceeds SMTP limits (25 MB), logs a warning and dispatches the summary email with an embedded size alert rather than failing.
- **Embedded Summary Card**: Clean HTML card template with status-colored indicators for stakeholders.
- **Cross-Browser Execution**: Pre-configured for parallel runs across Chromium, Firefox, and WebKit.
- **Flexible SMTP Configuration**: Seamlessly works with Gmail (App Passwords) or any standard SMTP email server.

---

## 🛠️ Technologies Used

| Technology | Purpose |
| :--- | :--- |
| **[Playwright](https://playwright.dev/)** | Core end-to-end browser automation framework |
| **[TypeScript](https://www.typescriptlang.org/)** | Strongly-typed JavaScript for scalable and reliable test code |
| **[Nodemailer](https://nodemailer.com/)** | Sends automated emails with attachments via SMTP |
| **[Archiver](https://www.npmjs.com/package/archiver)** | Archives and compresses the HTML report folder into a `.zip` file |
| **[Dotenv](https://www.npmjs.com/package/dotenv)** | Loads environment variables (`.env`) for secure email credentials |

---

## 📦 Mandatory NPM Packages

To set up the automatic email reporter in your project, install the following required packages:

### 1. Production Dependencies
```bash
npm install nodemailer dotenv archiver
```

### 2. Development & TypeScript Type Definitions
```bash
npm install -D @types/nodemailer @types/archiver
```

### 3. Playwright & Browsers (if starting fresh)
```bash
npm install -D @playwright/test
npx playwright install --with-deps
```

---

## 📁 Project Structure

```text
playwright-email-reporter/
├── reporters/
│   └── email-reporter.ts         # Custom reporter: zips report & dispatches email
├── tests/
│   └── login-data-driven.spec.ts # Sample test suite
├── .env.example                  # Environment variable template
├── .env                          # Local email credentials
├── package.json                  # Dependencies & scripts
└── playwright.config.ts          # Playwright configuration with custom reporter
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```ini
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_16_digit_app_password
EMAIL_TO=recipient-email@gmail.com
```

### Setting Up a Gmail App Password:
1. Open your **Google Account** > **Security**.
2. Ensure **2-Step Verification** is turned ON.
3. Search for **App passwords**.
4. Generate a new app password (e.g., name it `PlaywrightReporter`).
5. Paste the generated 16-character code into `EMAIL_PASSWORD`.

---

## ⚙️ Reporter Registration

The custom reporter is registered in `playwright.config.ts`:

```typescript
reporter: [
  ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ['./reporters/email-reporter.ts']
]
```

### How It Works:
1. **`onEnd(result)`**: Captures the overall execution result (`passed`, `failed`, etc.).
2. **`onExit()`**: 
   - Archives the target report directory (`playwright-report/` or your Allure/custom folder) into `playwright-report.zip`.
   - Transports the email with the `.zip` attachment using Nodemailer.

---

## 🧪 Running Tests

### Run all tests and trigger email:
```bash
npx playwright test
```

### Run tests with browser UI:
```bash
npx playwright test --headed
```

### Run a specific test file:
```bash
npx playwright test tests/login-data-driven.spec.ts
```

### Run on a specific browser:
```bash
npx playwright test --project=chromium
```

### Open the local report manually (optional):
```bash
npx playwright show-report
```
