const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = [
  'vi/events-calendar/index.html',
  'ja/events-calendar/index.html',
  'ko/events-calendar/index.html',
  'zh/events-calendar/index.html',
];

for (const rel of files) {
  const fp = path.join(root, rel);
  let html = fs.readFileSync(fp, 'utf8');
  html = html.replace(
    /<div class="events-column" id="events-list">[\s\S]*?<\/div><!-- \/events-column -->/,
    '<div class="events-column" id="events-list">\n    <p style="padding:24px;color:var(--gray-500);">Loading events…</p>\n  </div><!-- /events-column -->',
  );
  html = html.replace(
    /<script>\s*\/\/ ── Filter[\s\S]*?applyEventListFilters\(\);\s*<\/script>/,
    '<script src="../../js/hl-auth-env.js"></script>\n<script src="../../js/hl-events-calendar.js" defer></script>',
  );
  fs.writeFileSync(fp, html);
  console.log('updated', rel);
}
