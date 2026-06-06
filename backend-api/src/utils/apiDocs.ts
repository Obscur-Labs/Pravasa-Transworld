export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AuthLevel = 'public' | 'user' | 'admin';

export interface Endpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: AuthLevel;
  notes?: string;
}

export interface EndpointGroup {
  title: string;
  endpoints: Endpoint[];
}

const METHOD_COLOR: Record<HttpMethod, string> = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#f97316',
  DELETE: '#ef4444',
};

const AUTH_BADGE: Record<AuthLevel, { label: string; color: string }> = {
  public: { label: 'Public', color: '#6b7280' },
  user: { label: 'User JWT', color: '#8b5cf6' },
  admin: { label: 'Admin JWT', color: '#0ea5e9' },
};

function endpointRow(ep: Endpoint): string {
  const mc = METHOD_COLOR[ep.method];
  const ab = AUTH_BADGE[ep.auth];
  return `
    <tr>
      <td><span class="badge" style="background:${mc}">${ep.method}</span></td>
      <td><code>${ep.path}</code></td>
      <td>${ep.description}${ep.notes ? `<br><span class="note">${ep.notes}</span>` : ''}</td>
      <td><span class="badge" style="background:${ab.color}">${ab.label}</span></td>
    </tr>`;
}

function groupSection(g: EndpointGroup): string {
  return `
    <section>
      <h2>${g.title}</h2>
      <table>
        <thead><tr><th>Method</th><th>Path</th><th>Description</th><th>Auth</th></tr></thead>
        <tbody>${g.endpoints.map(endpointRow).join('')}</tbody>
      </table>
    </section>`;
}

export function generateDocsHTML(title: string, groups: EndpointGroup[]): string {
  const totalEndpoints = groups.reduce((n, g) => n + g.endpoints.length, 0);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — API Docs</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; line-height: 1.6; }
    header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #1e3a5f; padding: 2rem; }
    header h1 { font-size: 1.75rem; font-weight: 700; color: #f1f5f9; }
    header p { color: #94a3b8; margin-top: .25rem; }
    .meta { display: flex; gap: 1rem; margin-top: .75rem; flex-wrap: wrap; }
    .meta span { font-size: .75rem; background: #1e293b; border: 1px solid #334155; border-radius: 9999px; padding: .2rem .75rem; color: #94a3b8; }
    main { max-width: 1100px; margin: 2rem auto; padding: 0 1.5rem 4rem; }
    section { margin-bottom: 2.5rem; }
    h2 { font-size: 1.1rem; font-weight: 600; color: #cbd5e1; border-left: 3px solid #3b82f6; padding-left: .75rem; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: .75rem; overflow: hidden; border: 1px solid #1e3a5f; }
    thead { background: #0f172a; }
    th { text-align: left; padding: .65rem 1rem; font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; color: #64748b; font-weight: 600; }
    td { padding: .7rem 1rem; border-top: 1px solid #1e3a5f; font-size: .875rem; vertical-align: top; }
    tr:hover td { background: #263346; }
    code { font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: .8rem; color: #e2e8f0; background: #0f172a; padding: .15rem .4rem; border-radius: .25rem; }
    .badge { display: inline-block; padding: .15rem .55rem; border-radius: .3rem; font-size: .7rem; font-weight: 700; color: #fff; letter-spacing: .04em; }
    .note { font-size: .75rem; color: #64748b; margin-top: .25rem; display: block; }
    .legend { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 2rem; padding: 1rem 1.25rem; background: #1e293b; border-radius: .75rem; border: 1px solid #1e3a5f; }
    .legend-item { display: flex; align-items: center; gap: .4rem; font-size: .75rem; color: #94a3b8; }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p>Interactive API reference — all available endpoints</p>
    <div class="meta">
      <span>${totalEndpoints} endpoints</span>
      <span>${groups.length} groups</span>
      <span>Base URL: /api</span>
    </div>
  </header>
  <main>
    <div class="legend">
      ${Object.entries(METHOD_COLOR).map(([m, c]) => `<div class="legend-item"><span class="badge" style="background:${c}">${m}</span></div>`).join('')}
      <div style="width:1px;background:#334155;margin:0 .5rem"></div>
      ${Object.values(AUTH_BADGE).map(a => `<div class="legend-item"><span class="badge" style="background:${a.color}">${a.label}</span></div>`).join('')}
    </div>
    ${groups.map(groupSection).join('')}
  </main>
</body>
</html>`;
}
