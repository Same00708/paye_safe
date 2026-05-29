#!/usr/bin/env node
/**
 * Génère l'app Next.js PaySafe depuis backend + web existants.
 * Usage: node scripts/setup-next.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYSAFE = path.resolve(__dirname, "..");
const ROOT = path.resolve(PAYSAFE, "..");
const BACKEND = path.join(ROOT, "backend", "src");
const WEB = path.join(ROOT, "web", "src");
const DATABASE = path.join(ROOT, "database");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fixServerImports(content) {
  return content
    .replace(/from "(\.\.?\/[^"]+)\.js"/g, 'from "$1"')
    .replace(/from '(\.\.?\/[^']+)\.js'/g, "from '$1'")
    .replace(/import\("(\.\.?\/[^"]+)\.js"\)/g, 'import("$1")')
    .replace(/import\('(\.\.?\/[^']+)\.js'\)/g, "import('$1')");
}

function copyDir(src, dest, { transform } = {}) {
  if (!fs.existsSync(src)) {
    console.warn("Missing:", src);
    return;
  }
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) {
      copyDir(s, d, { transform });
    } else if (name.endsWith(".ts") || name.endsWith(".tsx") || name.endsWith(".css")) {
      let content = fs.readFileSync(s, "utf8");
      if (transform) content = transform(content, s);
      fs.writeFileSync(d, content);
    } else if (name.endsWith(".css")) {
      fs.copyFileSync(s, d);
    }
  }
}

function copySql() {
  ensureDir(path.join(PAYSAFE, "database"));
  if (!fs.existsSync(DATABASE)) return;
  for (const f of fs.readdirSync(DATABASE)) {
    if (f.endsWith(".sql")) {
      fs.copyFileSync(path.join(DATABASE, f), path.join(PAYSAFE, "database", f));
    }
  }
}

function transformPage(content, filePath) {
  let c = content;
  const isTsx = filePath.endsWith(".tsx");

  if (isTsx && !c.includes('"use client"') && !c.includes("'use client'")) {
    c = `'use client';\n\n${c}`;
  }

  c = c
    // 1. Common react-router-dom imports
    .replace(/import\s*\{\s*Link\s*\}\s*from\s*["']react-router-dom["'];?/g, 'import Link from "next/link";')
    .replace(/import\s*\{\s*Link\s*,\s*([^}]+)\}\s*from\s*["']react-router-dom["'];?/g, 'import Link from "next/link";\nimport { $1 } from "next/navigation";')
    .replace(/import\s*\{\s*([^,]+),\s*Link\s*\}\s*from\s*["']react-router-dom["'];?/g, 'import Link from "next/link";\nimport { $1 } from "next/navigation";')
    .replace(/import\s*\{\s*NavLink\s*,\s*Outlet\s*\}\s*from\s*["']react-router-dom["'];?/g, 'import Link from "next/link";\nimport { usePathname } from "next/navigation";')
    .replace(/from\s*["']react-router-dom["']/g, 'from "next/navigation"')

    // 2. Navigation hooks & shims
    .replace(/\buseLocation\b/g, "usePathname")
    .replace(/\buseNavigate\b/g, "useRouter")
    .replace(/useParams<[^>]+>\(\)/g, "useParams() as any")
    .replace(
      /const \[searchParams, setSearchParams\] = useSearchParams\(\);?/g,
      'const searchParams = useSearchParams();\n  const router = useRouter();\n  const pathname = usePathname();\n  const setSearchParams = (p: any) => { const sp = new URLSearchParams(searchParams?.toString() ?? ""); Object.entries(p).forEach(([k, v]) => v === undefined || v === null ? sp.delete(k) : sp.set(k, v as string)); router.push(`${pathname}?${sp.toString()}`); };',
    )
    .replace(/const navigate\s*=\s*useRouter\(\)/g, "const router = useRouter()")
    .replace(/\bnavigate\(/g, "router.push(")
    .replace(/,\s*navigate\s*\]/g, ", router]")
    .replace(/\[\s*navigate\s*\]/g, "[router]")
    .replace(/\[\s*navigate\s*,/g, "[router,")
    .replace(/,\s*navigate\s*,/g, ", router,")
    .replace(/router\.push\((.+),\s*\{\s*replace:\s*true\s*\}\)/g, "router.replace($1)")

    // 3. Import deduplication/cleanup
    .replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*["']next\/navigation["']/g, (match, p1) => {
      const parts = p1.split(",").map((s) => s.trim());
      const forbidden = ["Navigate", "Link", "NavLink", "Outlet"];
      const unique = Array.from(new Set([...parts, "useRouter", "usePathname", "useParams"])).filter(
        (n) => n && !forbidden.includes(n),
      );
      return `import { ${unique.join(", ")} } from "next/navigation"`;
    })

    // 4. JSX & Specific Patterns
    .replace(/<NavLink/g, "<Link")
    .replace(/<\/NavLink>/g, "</Link>")
    .replace(/className=\{\(\{\s*isActive\s*\}\)\s*=>\s*\(isActive\s*\?\s*["']active["']\s*:\s*["']["']\)\}/g, 'className="nav-link"')
    .replace(/\bto\s*=\s*\{/g, "href={")
    .replace(/\bto\s*=\s*(["'])/g, 'href=$1')
    .replace(/\(location\.state as [^)]+\)\?\.from/g, "undefined")
    .replace(/\blocation\.state\b/g, "undefined")
    .replace(/searchParams\.get/g, "searchParams?.get")
    .replace(/usePathname\(\)/g, '(usePathname() ?? "")')
    .replace(/<Navigate\s+(?:to|href)=([^ ]+) [^>]*\/>/g, 'null; // Redirect to $1 should be handled in useEffect')

    // 5. Path Aliases
    .replace(/from\s*["']\.\.\/api\/client["']/g, 'from "@/lib/api-client"')
    .replace(/from\s*["']\.\.\/context\//g, 'from "@/context/')
    .replace(/from\s*["']\.\.\/components\//g, 'from "@/components/')
    .replace(/from\s*["']\.\.\/hooks\//g, 'from "@/hooks/')
    .replace(/from\s*["']\.\.\/utils\//g, 'from "@/utils/')
    .replace(/from\s*["']\.\.\/types\//g, 'from "@/types/')

    // 6. CSS cleanup
    .replace(/import\s*["']\.\/pages\.css["'];?\n?/g, "")
    .replace(/import\s*["']\.\/auth\.css["'];?\n?/g, "")
    .replace(/import\s*["']\.\/admin\.css["'];?\n?/g, "")
    .replace(/import\s*["']\.\.\/components\/UserChip\.css["'];?\n?/g, "")
    
    // 7. Miscellaneous fixes
    .replace(/total: number;\n?/g, ""); // Fix AdminTx type error

  // Ensure Link is imported if used
  if (c.includes("<Link") && !c.includes('from "next/link"')) {
    if (c.startsWith("'use client'") || c.startsWith('"use client"')) {
      const lines = c.split("\n");
      lines.splice(1, 0, 'import Link from "next/link";');
      c = lines.join("\n");
    } else {
      c = `import Link from "next/link";\n${c}`;
    }
  }

  if (filePath.includes("Layout.tsx")) {
    c = c.replace(/<Outlet \/>/g, "{children}");
    c = c.replace(/export function Layout\(\)/g, "export function Layout({ children }: { children: React.ReactNode })");
  }

  return c;
}

console.info("PaySafe Next.js setup…");

// 1. Server lib
copyDir(BACKEND, path.join(PAYSAFE, "lib", "server"), {
  transform: (content) => fixServerImports(content),
});

// 2. SQL
copySql();

// 3. Styles, components, context, hooks, types, utils
copyDir(path.join(WEB, "styles"), path.join(PAYSAFE, "styles"));
copyDir(path.join(WEB, "components"), path.join(PAYSAFE, "components"), {
  transform: (content, filePath) => transformPage(content, filePath),
});
copyDir(path.join(WEB, "context"), path.join(PAYSAFE, "context"), {
  transform: (content, filePath) => transformPage(content, filePath),
});
copyDir(path.join(WEB, "hooks"), path.join(PAYSAFE, "hooks"), {
  transform: (content, filePath) => transformPage(content, filePath),
});
copyDir(path.join(WEB, "types"), path.join(PAYSAFE, "types"), {
  transform: (content, filePath) => transformPage(content, filePath),
});
copyDir(path.join(WEB, "utils"), path.join(PAYSAFE, "utils"), {
  transform: (content, filePath) => transformPage(content, filePath),
});

// 4. api client
let apiClient = fs.readFileSync(path.join(WEB, "api", "client.ts"), "utf8");
apiClient = apiClient.replace(
  /const API_BASE = import\.meta\.env\.VITE_API_URL \?\? "\/api";/,
  'const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";',
);
fs.writeFileSync(path.join(PAYSAFE, "lib", "api-client.ts"), apiClient);

// 5. Pages -> app routes
const pageMap = [
  ["pages/HomePage.tsx", "app/page.tsx"],
  ["pages/LoginPage.tsx", "app/connexion/page.tsx"],
  ["pages/RegisterPage.tsx", "app/inscription/page.tsx"],
  ["pages/TransactionsPage.tsx", "app/transactions/page.tsx"],
  ["pages/CreateTransactionPage.tsx", "app/transactions/nouvelle/page.tsx"],
  ["pages/TransactionDetailPage.tsx", "app/transactions/[id]/page.tsx"],
  ["pages/NotificationsPage.tsx", "app/notifications/page.tsx"],
  ["pages/AdminPage.tsx", "app/admin/page.tsx"],
];

for (const [src, dest] of pageMap) {
  const srcPath = path.join(WEB, src);
  if (!fs.existsSync(srcPath)) continue;
  let content = fs.readFileSync(srcPath, "utf8");
  content = transformPage(content, dest);
  const destPath = path.join(PAYSAFE, dest);
  ensureDir(path.dirname(destPath));
  const base = path.basename(src, ".tsx");
  content = content.replace(
    new RegExp(`export function ${base}`),
    `export default function ${base}`,
  );
  fs.writeFileSync(destPath, content);
}

// 6. CSS pages
for (const css of ["pages.css", "auth.css", "admin.css"]) {
  const s = path.join(WEB, "pages", css);
  if (fs.existsSync(s)) fs.copyFileSync(s, path.join(PAYSAFE, "app", css));
}

const layoutPath = path.join(PAYSAFE, "app", "layout.tsx");
if (fs.existsSync(layoutPath)) {
  let layout = fs.readFileSync(layoutPath, "utf8");
  for (const imp of ['import "@/app/pages.css";', 'import "@/app/auth.css";', 'import "@/app/admin.css";']) {
    if (!layout.includes(imp)) {
      layout = layout.replace(
        'import "@/styles/components.css";',
        `import "@/styles/components.css";\n${imp}`,
      );
    }
  }
  fs.writeFileSync(layoutPath, layout);
}

// 7. schemaDir + env Next.js
const schemaDirPath = path.join(PAYSAFE, "lib", "server", "db", "schemaDir.ts");
if (fs.existsSync(schemaDirPath)) {
  let sd = fs.readFileSync(schemaDirPath, "utf8");
  if (!sd.includes("process.cwd()")) {
    sd = sd.replace(
      "const candidates = [",
      `const candidates = [\n    path.join(process.cwd(), "database"),`,
    );
  }
  fs.writeFileSync(schemaDirPath, sd);
}

const envPath = path.join(PAYSAFE, "lib", "server", "config", "env.ts");
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, "utf8");
  envContent = envContent.replace(
    /appBaseUrl: process\.env\.APP_BASE_URL \?\? "http:\/\/localhost:5173",/,
    `appBaseUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_BASE_URL ??
    (process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : "http://localhost:3000"),`,
  );
  envContent = envContent.replace(
    /const raw = process\.env\.CORS_ORIGIN \?\? "http:\/\/localhost:5173";/,
    `const raw =
    process.env.CORS_ORIGIN ??
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? \`https://\${process.env.VERCEL_URL}\` : "http://localhost:3000");`,
  );
  fs.writeFileSync(envPath, envContent);
}

// .env.local = même base que l'ancien backend Supabase
const backendEnv = path.join(ROOT, "backend", ".env");
const localEnv = path.join(PAYSAFE, ".env.local");
if (fs.existsSync(backendEnv)) {
  fs.copyFileSync(backendEnv, localEnv);
  let local = fs.readFileSync(localEnv, "utf8");
  if (!/NEXT_PUBLIC_APP_URL=/m.test(local)) {
    local += "\nNEXT_PUBLIC_APP_URL=http://localhost:3000\n";
  }
  fs.writeFileSync(localEnv, local);
  console.info("Copié backend/.env → paysafe/.env.local");
}

// AuthContext → api-client
const authCtx = path.join(PAYSAFE, "context", "AuthContext.tsx");
if (fs.existsSync(authCtx)) {
  let ac = fs.readFileSync(authCtx, "utf8");
  if (!ac.includes('"use client"') && !ac.includes("'use client'")) {
    ac = `"use client";\n\n${ac}`;
  }
  ac = ac.replace(/from "\.\.\/api\/client"/g, 'from "@/lib/api-client"');
  fs.writeFileSync(authCtx, ac);
}

console.info("Done. Run: cd 03_Code/paysafe && npm install && npm run build");
