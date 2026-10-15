import { test, expect } from '@playwright/test';

interface LoginTestCase {
  username: string;
  password: string;
  expected: 'Dashboard should be visible' | 'Error message "Invalid credentials"';
}

const testCases: LoginTestCase[] = [
  {
    username: 'Admin',
    password: 'admin123',
    expected: 'Dashboard should be visible',
  },
  {
    username: 'fakeuser',
    password: 'fakepass',
    expected: 'Error message "Invalid credentials"',
  },
  {
    username: 'ESSUser1',
    password: 'ess123',
    expected: 'Error message "Invalid credentials"',
  },
];

test.describe('OrangeHRM - Login Functionality (Data Driven)', () => {
  for (const data of testCases) {
    test(`Login validation for user "${data.username}" -> Expects: ${data.expected}`, async ({ page }) => {
      // 1. Navigate to the login page
      await page.goto('https://opensource-demo.orangehrmlive.com/');

      // 2. Enter username and password
      await page.getByPlaceholder('Username').fill(data.username);
      await page.getByPlaceholder('Password').fill(data.password);

      // 3. Click on the Login button
      await page.getByRole('button', { name: 'Login' }).click();

      // 4. Validate the expected result
      if (data.expected === 'Dashboard should be visible') {
        // Verify dashboard is visible for valid credentials
        await expect(page).toHaveURL(/.*dashboard.*/);
        await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

        // If login is successful: Click on User icon and Logout
        await page.locator('.oxd-userdropdown-tab').click();
        await page.getByRole('menuitem', { name: 'Logout' }).click();
        await expect(page).toHaveURL(/.*auth\/login.*/);
        await expect(page.getByPlaceholder('Username')).toBeVisible();
      } else {
        // Verify error message "Invalid credentials" for invalid credentials
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByText('Invalid credentials')).toBeVisible();
      }
    });
  }
});
