import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { ZipArchive } from 'archiver';
import fs from 'fs';
import path from 'path';

dotenv.config();

class EmailReporter implements Reporter {
  private testResult: FullResult | undefined;
  private testMap = new Map<string, TestCase>();
  private startTime: number = Date.now();
  private totalConfiguredTests: number = 0;

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();
    this.totalConfiguredTests = suite.allTests().length;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.testMap.set(test.id, test);
  }

  async onEnd(result: FullResult) {
    this.testResult = result;
  }

  async onExit() {
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.warn('⚠️ Email credentials not found. Skipping email report.');
        return;
      }

      const reportFolder = path.resolve('playwright-report');
      const zipFile = path.resolve('playwright-report.zip');

      if (!fs.existsSync(reportFolder)) {
        console.error('Playwright report folder not found.');
        return;
      }

      // Create ZIP
      await new Promise<void>((resolve, reject) => {
        const output = fs.createWriteStream(zipFile);
        const archive = new ZipArchive({
          zlib: { level: 9 }
        });

        output.on('close', () => {
          console.log(`ZIP created: ${archive.pointer()} bytes`);
          resolve();
        });

        output.on('error', reject);
        archive.on('error', reject);

        archive.pipe(output);
        archive.directory(reportFolder, false);
        archive.finalize();
      });

      const status = this.testResult?.status ?? 'unknown';

      // Calculate execution summary metrics
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      let flaky = 0;

      const projectSet = new Set<string>();

      for (const test of this.testMap.values()) {
        const outcome = test.outcome();
        if (outcome === 'expected') {
          passed++;
        } else if (outcome === 'unexpected') {
          failed++;
        } else if (outcome === 'flaky') {
          flaky++;
        } else if (outcome === 'skipped') {
          skipped++;
        }

        const proj = test.parent.project()?.name;
        if (proj) projectSet.add(proj);
      }

      const total = this.testMap.size || this.totalConfiguredTests;
      const skippedFlaky = skipped + flaky;
      const durationMs = this.testResult?.duration ?? (Date.now() - this.startTime);
      const durationSec = (durationMs / 1000).toFixed(1);

      // Format Execution Timestamp: "15 Oct 2026, 06:19 PM"
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');
      const executedAt = `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;

      // Environment Details
      const osPlatform = process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux';
      const environment = process.env.CI
        ? (process.env.GITHUB_ACTIONS ? 'CI / GitHub Actions' : 'CI Server')
        : `Local (${osPlatform})`;

      // Browsers Run
      const browsersRun = projectSet.size > 0
        ? Array.from(projectSet).join(', ')
        : 'Chromium, Firefox, WebKit';

      // Attachment Size Safety Check (25 MB limit for Gmail & SMTP providers)
      const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB
      const zipStats = fs.statSync(zipFile);
      const zipSizeBytes = zipStats.size;
      const isOverSizeLimit = zipSizeBytes > MAX_ATTACHMENT_BYTES;
      const zipSizeMB = (zipSizeBytes / (1024 * 1024)).toFixed(2);

      const attachments: Array<{ filename: string; path: string }> = [];
      let attachmentNoticeHtml = '';
      let attachmentNoticeText = '';

      if (isOverSizeLimit) {
        console.warn(`⚠️ Attachment size exceeds 25 MB limit (${zipSizeMB} MB). Sending email without attachment.`);
        attachmentNoticeHtml = `
          <div style="background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 10px 14px; margin: 14px 0; font-family: Arial, sans-serif; border-radius: 4px;">
            <p style="margin: 0; color: #856404; font-weight: bold;">⚠️ Warning: Report ZIP size (${zipSizeMB} MB) exceeds the 25 MB email attachment limit. The ZIP attachment was omitted from this email.</p>
          </div>
        `;
        attachmentNoticeText = `\n⚠️ Warning: Report ZIP size (${zipSizeMB} MB) exceeds the 25 MB email attachment limit. The ZIP attachment was omitted.\n`;
      } else {
        attachments.push({
          filename: 'playwright-report.zip',
          path: zipFile
        });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const statusColor = status.toLowerCase() === 'passed' ? '#2e7d32' : '#d32f2f';

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: `Playwright Test Report - ${status.toUpperCase()} (${passed}/${total} Passed)`,

        text: `Playwright Automation Execution Report
Status: ${status.toUpperCase()}

Execution Summary:
Total Tests: ${total}
Passed: ${passed} ✅
Failed: ${failed} ❌
Skipped / Flaky: ${skippedFlaky} ⚠️
Duration: ${durationSec}s ⏱️

Executed At: ${executedAt}
Environment: ${environment}
Browsers Run: ${browsersRun}
${attachmentNoticeText}
The Playwright automation execution has completed.
Please find the HTML report attached as a ZIP file.

Regards,
Automation Team`,

        html: `
          <h2>Playwright Automation Execution Report</h2>

          <p><b>Status:</b> <span style="color: ${statusColor}; font-weight: bold;">${status.toUpperCase()}</span></p>

          <div style="background-color: #f8f9fa; border-left: 4px solid ${statusColor}; padding: 14px 18px; margin: 16px 0; font-family: Arial, sans-serif; max-width: 480px; border-radius: 4px;">
            <h3 style="margin-top: 0; margin-bottom: 10px; color: #333;">Execution Summary</h3>
            <p style="margin: 4px 0;"><b>Total Tests:</b> ${total}</p>
            <p style="margin: 4px 0;"><b>Passed:</b> ${passed} ✅</p>
            <p style="margin: 4px 0;"><b>Failed:</b> ${failed} ❌</p>
            <p style="margin: 4px 0;"><b>Skipped / Flaky:</b> ${skippedFlaky} ⚠️</p>
            <p style="margin: 4px 0;"><b>Duration:</b> ${durationSec}s ⏱️</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 10px 0;" />
            <p style="margin: 4px 0;"><b>Executed At:</b> ${executedAt}</p>
            <p style="margin: 4px 0;"><b>Environment:</b> ${environment}</p>
            <p style="margin: 4px 0;"><b>Browsers Run:</b> ${browsersRun}</p>
          </div>

          ${attachmentNoticeHtml}

          <p>
            The Playwright automation execution has completed.
            ${isOverSizeLimit ? 'Please review report artifacts directly in CI/local storage.' : 'Please find the HTML report attached as a ZIP file.'}
          </p>

          <p>Regards,<br>Automation Team</p>
        `,

        attachments
      });

      console.log('Playwright report email sent successfully.');

    } catch (error) {
      console.error('Failed to send Playwright report email:', error);
    }
  }
}

export default EmailReporter;