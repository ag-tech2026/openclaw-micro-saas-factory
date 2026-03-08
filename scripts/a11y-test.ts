import { chromium, Browser, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const PAGES = [
  '/',
  '/sign-in',
  '/admin',
  '/calculator'
];

// Thresholds: fail if violations exceed these numbers
const THRESHOLDS: Record<string, number> = {
  critical: 0,
  serious: 0,
  moderate: 10,
  minor: 20
};

interface A11yResults {
  page: string;
  violations: any[];
  passed: boolean;
}

async function runAccessibilityTests(): Promise<void> {
  console.log('Starting accessibility tests...');
  const results: A11yResults[] = [];
  let browser: Browser | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: 'new',
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Set viewport for better testing
    await page.setViewportSize({ width: 1280, height: 720 });

    for (const pagePath of PAGES) {
      const url = `${BASE_URL}${pagePath}`;
      console.log(`\nTesting: ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Inject axe-core from CDN
        await page.addScriptTag({
          url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.11.1/axe.min.js'
        });

        // Run axe-core accessibility scan
        const axeResults = await page.evaluate(() => {
          return (window as any).axe.run(document, {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
            }
          });
        });

        const violations = axeResults.violations || [];
        const passed = !violations.some((v: any) => v.tags.includes('wcag2a') && v.impact === 'critical');

        results.push({
          page: pagePath,
          violations,
          passed
        });

        console.log(`  ✓ Found ${violations.length} violations`);
        if (violations.length > 0) {
          violations.forEach((v: any) => {
            console.log(`    - ${v.impact.toUpperCase()}: ${v.id} - ${v.help}`);
            console.log(`      Nodes: ${v.nodes.length}`);
          });
        }
      } catch (error) {
        console.error(`  ✗ Error testing ${url}:`, error);
        results.push({
          page: pagePath,
          violations: [],
          passed: false
        });
      }
    }

    // Generate report
    await generateReport(results);

    // Check thresholds and exit
    const totalCritical = results.reduce((sum, r) =>
      sum + r.violations.filter((v: any) => v.impact === 'critical').length, 0
    );
    const totalSerious = results.reduce((sum, r) =>
      sum + r.violations.filter((v: any) => v.impact === 'serious').length, 0
    );
    const totalModerate = results.reduce((sum, r) =>
      sum + r.violations.filter((v: any) => v.impact === 'moderate').length, 0
    );
    const totalMinor = results.reduce((sum, r) =>
      sum + r.violations.filter((v: any) => v.impact === 'minor').length, 0
    );

    console.log('\n=== Summary ===');
    console.log(`Pages tested: ${results.length}`);
    console.log(`Critical violations: ${totalCritical} (threshold: ${THRESHOLDS.critical})`);
    console.log(`Serious violations: ${totalSerious} (threshold: ${THRESHOLDS.serious})`);
    console.log(`Moderate violations: ${totalModerate} (threshold: ${THRESHOLDS.moderate})`);
    console.log(`Minor violations: ${totalMinor} (threshold: ${THRESHOLDS.minor})`);

    const failed =
      totalCritical > THRESHOLDS.critical ||
      totalSerious > THRESHOLDS.serious ||
      totalModerate > THRESHOLDS.moderate ||
      totalMinor > THRESHOLDS.minor;

    if (failed) {
      console.error('\n❌ Accessibility tests FAILED: Violations exceed threshold.');
      console.error('Please fix the violations and try again.');
      process.exit(1);
    } else {
      console.log('\n✅ Accessibility tests PASSED: All thresholds met.');
      process.exit(0);
    }

  } catch (error) {
    console.error('Fatal error running accessibility tests:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function generateReport(results: A11yResults[]): Promise<void> {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(reportsDir, `a11y-report-${timestamp}.html`);
  const summaryFile = path.join(reportsDir, `a11y-summary-${timestamp}.json`);

  // Save JSON summary
  const summary = results.map(r => ({
    page: r.page,
    totalViolations: r.violations.length,
    violations: r.violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      nodes: v.nodes.length
    }))
  }));
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));

  // Generate HTML report
  const html = generateHtmlReport(summary);
  fs.writeFileSync(reportFile, html);

  console.log(`\n📊 Report generated:`);
  console.log(`   JSON: ${summaryFile}`);
  console.log(`   HTML: ${reportFile}`);
}

function generateHtmlReport(summary: any[]): string {
  const totalViolations = summary.reduce((sum, s) => sum + s.totalViolations, 0);
  const failedPages = summary.filter(s => s.totalViolations > 0).length;

  const rows = summary.map(s => `
    <tr>
      <td>${s.page}</td>
      <td class="${s.totalViolations > 0 ? 'violation' : 'pass'}">${s.totalViolations}</td>
      <td>${s.violations.map((v: any) => `
        <div class="violation-item">
          <strong>${v.impact.toUpperCase()}</strong>: ${v.help}
          <br><a href="${v.helpUrl}" target="_blank">Learn more</a>
          (${v.nodes} nodes)
        </div>
      `).join('')}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test Report</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 2px solid #0070f3; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e0e0e0; }
    .stat-value { font-size: 2em; font-weight: bold; }
    .stat-label { color: #666; font-size: 0.9em; }
    .critical { color: #dc2626; }
    .serious { color: #ea580c; }
    .moderate { color: #d97706; }
    .pass { color: #16a34a; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f8f9fa; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .violation-item { margin: 4px 0 8px; padding: 8px; background: #fef2f2; border-left: 3px solid #dc2626; border-radius: 4px; }
    .violation-item a { color: #0070f3; }
    .footer { margin-top: 30px; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Accessibility Test Report</h1>
    <div class="summary">
      <div class="stat">
        <div class="stat-value">${summary.length}</div>
        <div class="stat-label">Pages Tested</div>
      </div>
      <div class="stat">
        <div class="stat-value ${totalViolations > 0 ? 'critical' : 'pass'}">${totalViolations}</div>
        <div class="stat-label">Total Violations</div>
      </div>
      <div class="stat">
        <div class="stat-value ${failedPages > 0 ? 'critical' : 'pass'}">${failedPages}</div>
        <div class="stat-label">Pages with Issues</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Page</th>
          <th>Violations</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="footer">
      <p>Generated: ${new Date().toLocaleString()}</p>
      <p>Base URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Run if this is the main module
if (require.main === module) {
  runAccessibilityTests().catch(console.error);
}

export { runAccessibilityTests };
