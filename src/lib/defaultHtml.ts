export const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #fafafa;
      color: #111;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
    }
    .badge { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: #999; font-weight: 500; }
    h1 { font-size: 2.5rem; font-weight: 700; }
    p { color: #666; max-width: 420px; line-height: 1.65; }
  </style>
</head>
<body>
  <span class="badge">Onboarding</span>
  <h1>Welcome to the team, <span style="color:#2563eb">Zxqvb</span> 👋</h1>
  <p>As part of onboarding, we have new hires fix code. Anything wrong with this page?</p>
</body>
</html>`;
