const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../../live-content.js'), 'utf8');

function element() {
  return { children: [], dataset: {}, hidden: false, textContent: '',
    get firstChild() { return this.children[0]; },
    appendChild(child) { this.children.push(child); },
    removeChild(child) { this.children.splice(this.children.indexOf(child), 1); }
  };
}
async function render({ live = false, hostname = 'localhost', rows = [], fail = false } = {}) {
  const nodes = { notices: element(), 'notice-status': element(), 'notice-demo': element() };
  nodes.notices.dataset.limit = '3';
  nodes['notice-demo'].hidden = true;
  const requests = [];
  vm.runInNewContext(source, {
    window: { SMP_SUPABASE: live ? { url: 'https://example.test', key: 'public' } : {}, addEventListener() {} },
    location: { hostname }, Date, Intl,
    localStorage: { getItem: () => JSON.stringify({ notices: rows }) },
    document: { getElementById: id => nodes[id], querySelector: () => null, createElement: element },
    fetch: async url => { requests.push(url); if (fail) throw Error('offline'); return { ok: true, json: async () => rows }; }
  });
  await new Promise(resolve => setImmediate(resolve));
  return { nodes, requests };
}
const current = title => ({ title, body: '<b>Text stays text</b>', published: true, show_from: '2020-01-01', show_until: null });

test('local preview filters drafts, expired and future notices and limits the board to three', async () => {
  const { nodes } = await render({ rows: [
    { ...current('Draft'), published: false }, { ...current('Expired'), show_until: '2020-01-02' },
    { ...current('Future'), show_from: '2099-01-01' }, ...['A','B','C','D'].map(current)
  ] });
  assert.equal(nodes.notices.children.length, 3);
  assert.equal(nodes.notices.children[0].children[0].textContent, 'A');
  assert.equal(nodes.notices.children[0].children[1].textContent, '<b>Text stays text</b>');
  assert.equal(nodes['notice-demo'].hidden, false);
  assert.equal(nodes['notice-status'].hidden, true);
});
test('public unconfigured sites never show local demo data', async () => {
  const { nodes, requests } = await render({ hostname: 'church.example', rows: [current('Demo')] });
  assert.equal(nodes.notices.children.length, 0);
  assert.equal(nodes['notice-demo'].hidden, true);
  assert.equal(requests.length, 0);
});
test('live notices explicitly request published, date-filtered records', async () => {
  const { nodes, requests } = await render({ live: true, rows: [current('Live')] });
  assert.equal(nodes.notices.children[0].children[0].textContent, 'Live');
  assert.match(requests[0], /published=is.true&show_from=lte\.\d{4}-\d{2}-\d{2}/);
  assert.match(requests[0], /show_until.is.null/);
  assert.equal(requests.length, 1);
});
test('empty and failed responses have useful states', async () => {
  const empty = await render({ live: true });
  assert.equal(empty.nodes.notices.hidden, true);
  assert.match(empty.nodes['notice-status'].textContent, /No current notices/);
  const failed = await render({ live: true, fail: true });
  assert.match(failed.nodes['notice-status'].textContent, /couldn't load/);
});
