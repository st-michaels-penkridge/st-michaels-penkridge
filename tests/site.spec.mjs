// Loads every page of the site on a phone and a desktop and checks the four standards
// that a machine can check: no errors, nothing missing, accessible, fast.
import { readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { LAUNCHED, PAGE_WEIGHT_KB, PRIVATE, SKIP_PAGES } from './site.config.mjs';

const NOT_SITE = new Set(['node_modules', 'tests', 'test-results', 'playwright-report', 'supabase', 'scripts']);

function findPages(dir = '.') {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('.') || NOT_SITE.has(e.name)) return [];
    const path = join(dir, e.name);
    if (e.isDirectory()) return findPages(path);
    if (!e.name.endsWith('.html') || /^google[\w-]*\.html$/.test(e.name)) return [];
    return ['/' + relative('.', path).split(sep).join('/')];
  });
}

const pages = findPages().filter((p) => !SKIP_PAGES.includes(p)).sort();

test('the site has pages to test', () => expect(pages.length).toBeGreaterThan(0));

for (const path of pages) {
  test(path, async ({ page, baseURL }, { project }) => {
    const problems = [];
    page.on('pageerror', (e) => problems.push(`JavaScript error: ${e.message}`));
    page.on('console', (m) => {
      const from = m.location().url || baseURL;
      if (m.type() === 'error' && from.startsWith(baseURL) && !m.text().startsWith('Failed to load resource')) {
        problems.push(`Console error: ${m.text()}`);
      }
    });
    page.on('response', (r) => {
      if (r.url().startsWith(baseURL) && r.status() >= 400) problems.push(`Missing file (${r.status()}): ${new URL(r.url()).pathname}`);
    });

    const res = await page.goto(path, { waitUntil: 'load' });
    expect(res?.status(), 'page loads').toBeLessThan(400);
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    expect.soft(problems, 'no JavaScript errors or missing files').toEqual([]);
    expect.soft((await page.title()).trim(), 'page has a <title>').not.toBe('');
    expect.soft(await page.locator('html').getAttribute('lang'), '<html> has a lang').toBeTruthy();

    const imgs = page.locator('img');
    const noAlt = await imgs.evaluateAll((els) => els.filter((e) => !e.hasAttribute('alt')).map((e) => e.getAttribute('src')));
    expect.soft(noAlt, 'every image has alt text').toEqual([]);
    const noSize = await imgs.evaluateAll((els) => els.filter((e) => !e.hasAttribute('width') || !e.hasAttribute('height')).map((e) => e.getAttribute('src')));
    expect.soft(noSize, 'every image has width and height (stops the page jumping)').toEqual([]);

    const noindex = await page.locator('meta[name="robots" i][content*="noindex" i]').count();
    if (PRIVATE.some((p) => path.startsWith(p))) expect.soft(noindex, 'private page stays hidden from Google (noindex)').toBeGreaterThan(0);
    else if (LAUNCHED) expect.soft(noindex, 'public page is not hidden from Google after launch').toBe(0);

    if (project.name === 'phone') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect.soft(overflow, 'no sideways scrolling on a phone').toBeLessThanOrEqual(1);
    }

    if (project.name === 'desktop') {
      const kb = await page.evaluate(() =>
        Math.round(performance.getEntries().reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0) / 1024));
      expect.soft(kb, `page downloads under ${PAGE_WEIGHT_KB}KB on first load`).toBeLessThanOrEqual(PAGE_WEIGHT_KB);

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .exclude('iframe')
        .analyze();
      const serious = violations
        .filter((v) => v.impact === 'critical' || v.impact === 'serious')
        .map((v) => `${v.id}: ${v.help} (${v.nodes.length}x, e.g. ${v.nodes[0]?.target.join(' ')})`);
      expect.soft(serious, 'no serious accessibility problems (WCAG 2.2 AA)').toEqual([]);
    }
  });
}
