// generate.js — punitfetch card generator
// Run: node scripts/generate.js
// Requires: GITHUB_TOKEN env var

const fs = require("fs");
const path = require("path");

const USERNAME = "pntgoswami18";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error("❌ GITHUB_TOKEN is not set");
  process.exit(1);
}

async function fetchGitHubStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        name login bio company location
        followers { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          totalCount
          nodes {
            name stargazerCount pushedAt
            languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
              edges { size node { name color } }
            }
          }
        }
        contributionsCollection {
          totalCommitContributions totalPullRequestContributions
          contributionCalendar {
            totalContributions
            weeks { contributionDays { contributionCount date } }
          }
        }
        pullRequests(states: MERGED) { totalCount }
      }
    }
  `;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${GITHUB_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });
  const json = await res.json();
  if (json.errors) { console.error(json.errors); process.exit(1); }
  return json.data.user;
}

function computeStreak(calendar) {
  const days = calendar.weeks.flatMap(w => w.contributionDays)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const day of days) { if (day.contributionCount > 0) streak++; else break; }
  return streak;
}

function aggregateLanguages(repos) {
  const totals = {};
  for (const repo of repos)
    for (const edge of repo.languages.edges)
      totals[edge.node.name] = (totals[edge.node.name] || 0) + edge.size;
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const total = sorted.reduce((s, [, v]) => s + v, 0);
  return sorted.map(([name, bytes]) => ({ name, pct: Math.round((bytes / total) * 100) }));
}

function latestRepo(repos) {
  return repos
    .filter(r => r.pushedAt && r.name !== USERNAME)
    .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt))[0];
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function bar(pct) {
  const filled = Math.round((pct / 100) * 18);
  return "█".repeat(filled) + "░".repeat(18 - filled);
}

function pad(str, len) { return str.length >= len ? str : str + " ".repeat(len - str.length); }

function esc(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function buildSVG(stats) {
  const { name, login, followers, repositories, streak, totalCommits, totalPRs, languages, lastPush, stars } = stats;

  const C = {
    bg:"#0d1117", bgCard:"#161b22", border:"#30363d",
    green:"#3fb950", purple:"#c678dd", cyan:"#79c0ff",
    yellow:"#e3b341", orange:"#f0883e", red:"#ff7b72",
    white:"#e6edf3", dim:"#8b949e", accent:"#7c3aed",
  };

  const LANG_COLORS = {
    JavaScript:"#f1e05a", TypeScript:"#3178c6", Python:"#3572A5",
    Java:"#b07219", HTML:"#e34c26", CSS:"#563d7c", Shell:"#89e051",
    Kotlin:"#A97BFF", Ruby:"#701516", Go:"#00ADD8", Rust:"#dea584",
  };

  // H=380 gives enough vertical room for ASCII (90px) + languages (105px) + padding
  const W=760, H=380, MONO="'JetBrains Mono','Fira Code',monospace", LH=19, FONT=13;
  const LEFT_X=28, RIGHT_X=295, TOP_Y=52;
  const now = new Date().toUTCString().slice(0, 25);

  const rows = [
    ["",""], ["user",`${name} (${login})`], ["role","Senior SDET · QA Lead @ FloBiz"],
    ["os","macOS · M1 · 8+ yrs xp"], ["shell","Playwright · Cypress · Appium"],
    ["location","Haldwani, Uttarakhand"], ["",""],
    ["repos",`${repositories} public`], ["stars",`${stars} ★`],
    ["commits",`${totalCommits.toLocaleString()} this year`],
    ["streak", streak > 0 ? `${streak} days 🔥` : "0 days"],
    ["PRs merged",`${totalPRs}`], ["followers",`${followers}`],
    ["last push",lastPush], ["",""], ["updated",now],
  ];

  // PG logo — only solid block chars; box-drawing chars (╗╚═║) have inconsistent
  // advance widths in SVG web fonts and produce garbled output
  const ascii = [
    "████  ████",
    "█  █ █    ",
    "████ █ ███",
    "█    █   █",
    "█     ████",
  ];

  let rowsSVG="", y=TOP_Y;
  for (const [key,val] of rows) {
    if (!key && !val) { y += LH*0.6; continue; }
    rowsSVG += `
      <text x="${RIGHT_X}" y="${y}" font-family="${MONO}" font-size="${FONT}" fill="${C.cyan}" font-weight="600">${esc(key)}</text>
      <text x="${RIGHT_X+115}" y="${y}" font-family="${MONO}" font-size="${FONT}" fill="${C.dim}">: </text>
      <text x="${RIGHT_X+125}" y="${y}" font-family="${MONO}" font-size="${FONT}" fill="${C.white}">${esc(val)}</text>`;
    y += LH;
  }

  // ASCII art occupies y=57 to y=57+5×18=147 — rendered first so languages sit below it
  let asciiSVG="";
  let ay = TOP_Y + 5;
  for (const line of ascii) {
    asciiSVG += `<text x="${LEFT_X}" y="${ay}" font-family="${MONO}" font-size="13" fill="${C.accent}" font-weight="700">${esc(line)}</text>`;
    ay += 18;
  }

  // Languages section starts at y=162 (below ASCII art which ends ~y=147)
  // Bar layout (left panel is 28→265px, divider at 273):
  //   name  : x=28,  10 chars × 7.2px ≈ 72px  → ends ~100
  //   bar   : x=110, 14 chars × 7.2px ≈ 101px → ends ~211
  //   pct   : x=216, 4  chars × 7.2px ≈ 29px  → ends ~245  ✓ (< 273)
  const BAR_LEN = 14;
  const BAR_X = LEFT_X + 82;   // = 110
  const PCT_X  = BAR_X + 106;  // = 216

  let langSVG = `<text x="${LEFT_X}" y="${TOP_Y+110}" font-family="${MONO}" font-size="11" fill="${C.cyan}" font-weight="700" letter-spacing="1">LANGUAGES</text>`;
  let langY = TOP_Y + 110 + 17;
  for (const { name:ln, pct } of languages) {
    const color = LANG_COLORS[ln] || C.accent;
    const filled = Math.round(pct / 100 * BAR_LEN);
    const empty  = BAR_LEN - filled;
    langSVG += `
      <text x="${LEFT_X}" y="${langY}" font-family="${MONO}" font-size="12" fill="${C.dim}">${esc(pad(ln, 10))}</text>
      <text x="${BAR_X}" y="${langY}" font-family="${MONO}" font-size="12" fill="${color}">${"█".repeat(filled)}<tspan fill="#2d333b">${"░".repeat(empty)}</tspan></text>
      <text x="${PCT_X}" y="${langY}" font-family="${MONO}" font-size="12" fill="${C.yellow}">${String(pct).padStart(3)}%</text>`;
    langY += 21;
  }

  const swatchColors=[C.red,C.orange,C.yellow,C.green,C.cyan,C.purple,C.accent,C.dim];
  let swatchSVG=""; let sx=LEFT_X; const swatchY=H-42;
  for (const col of swatchColors) {
    swatchSVG += `<rect x="${sx}" y="${swatchY}" width="22" height="14" rx="2" fill="${col}"/>`;
    sx += 25;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&amp;display=swap');</style>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/><stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
    <linearGradient id="border-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${C.accent}" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="${C.cyan}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${C.accent}" stop-opacity="0.2"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" rx="10" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" rx="10" fill="none" stroke="url(#border-grad)" stroke-width="1.5"/>
  <rect x="0" y="0" width="${W}" height="34" rx="10" fill="${C.bgCard}"/>
  <rect x="0" y="24" width="${W}" height="10" fill="${C.bgCard}"/>
  <rect x="0" y="24" width="${W}" height="1" fill="${C.border}"/>
  <circle cx="20" cy="17" r="5" fill="#ff5f57"/>
  <circle cx="36" cy="17" r="5" fill="#febc2e"/>
  <circle cx="52" cy="17" r="5" fill="#28c840"/>
  <text x="${W/2}" y="22" text-anchor="middle" font-family="${MONO}" font-size="12" fill="${C.dim}">punitfetch — ${esc(login)}@github</text>
  <line x1="273" y1="42" x2="273" y2="${H-52}" stroke="${C.border}" stroke-width="1" stroke-dasharray="4,3"/>
  ${asciiSVG}
  ${langSVG}
  ${rowsSVG}
  ${swatchSVG}
  <text x="${sx+6}" y="${swatchY+11}" font-family="${MONO}" font-size="10" fill="${C.dim}">■ lang spread</text>
  <rect x="0" y="${H-4}" width="${W}" height="4" rx="0" fill="url(#border-grad)"/>
</svg>`;
}

async function main() {
  console.log("⏳ Fetching GitHub stats for", USERNAME);
  const user = await fetchGitHubStats();
  const repos = user.repositories.nodes;
  const cal = user.contributionsCollection.contributionCalendar;
  const stars = repos.reduce((s, r) => s + r.stargazerCount, 0);
  const streak = computeStreak(cal);
  const languages = aggregateLanguages(repos);
  const last = latestRepo(repos);
  const stats = {
    name: user.name || user.login, login: user.login,
    followers: user.followers.totalCount, repositories: user.repositories.totalCount,
    stars, totalContributions: cal.totalContributions,
    totalCommits: user.contributionsCollection.totalCommitContributions,
    totalPRs: user.pullRequests.totalCount,
    streak, languages, lastPush: last ? timeAgo(last.pushedAt) : "unknown",
  };
  console.log("📊 Stats:", { stars, streak, repos: stats.repositories, topLang: languages[0] });
  const svg = buildSVG(stats);
  const outPath = path.join(__dirname, "..", "punitfetch.svg");
  fs.writeFileSync(outPath, svg, "utf8");
  console.log("✅ Written →", outPath);
}

main().catch(err => { console.error(err); process.exit(1); });
