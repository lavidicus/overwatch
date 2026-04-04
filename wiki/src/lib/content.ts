import fs from "fs";
import path from "path";
import matter from "gray-matter";
import chokidar from "chokidar";
import { Document as FlexDocument } from "flexsearch";

export type DocType = "markdown" | "pdf";

export type DocMeta = {
  id: string;
  title: string;
  slug: string[];
  filePath: string;
  section: SectionKey;
  tags: string[];
  type: DocType;
  updatedAt: number;
  excerpt?: string;
  content?: string;
};

export type SectionKey = "playbooks" | "pkb" | "concepts" | "manuals";

export type NavItem = {
  title: string;
  slug?: string[];
  type?: DocType;
  children?: NavItem[];
};

const BASE_DIR = "/home/localadmin/.openclaw/workspace";

const SECTION_CONFIG: Record<SectionKey, { title: string; dir: string; exclude?: string[] }> = {
  playbooks: { title: "Playbooks", dir: "ITIL/playbooks" },
  pkb: { title: "PKB Resources", dir: "pkb/resources", exclude: ["Concepts", "System manuals"] },
  concepts: { title: "Concepts", dir: "pkb/resources/Concepts" },
  manuals: { title: "System Manuals", dir: "pkb/resources/System manuals" },
};

let indexReady = false;
let docsCache: DocMeta[] = [];
let navCache: Record<SectionKey, NavItem[]> = {
  playbooks: [],
  pkb: [],
  concepts: [],
  manuals: [],
};

let searchIndex: FlexDocument<DocMeta> | null = null;
let watcherStarted = false;
let buildInProgress: Promise<void> | null = null;

function isMarkdown(filePath: string) {
  return filePath.toLowerCase().endsWith(".md");
}

function isPdf(filePath: string) {
  return filePath.toLowerCase().endsWith(".pdf");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractTitle(content: string, filePath: string) {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  return path.basename(filePath, path.extname(filePath));
}

function extractTags(data: any, content: string): string[] {
  const tags: string[] = [];
  if (Array.isArray(data?.tags)) tags.push(...data.tags.map(String));
  if (typeof data?.tags === "string") {
    tags.push(
      ...data.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    );
  }
  if (data?.category) tags.push(String(data.category));
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch && tags.length === 0) tags.push(headingMatch[1].trim());
  return Array.from(new Set(tags));
}

function extractExcerpt(content: string): string {
  const cleaned = content
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\n+/g, " ")
    .trim();
  return cleaned.slice(0, 220);
}

function buildNavForSection(section: SectionKey, docs: DocMeta[]): NavItem[] {
  const tree: NavItem[] = [];

  const insert = (parts: string[], meta: DocMeta) => {
    let cursor = tree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;
      let node = cursor.find((n) => n.title === part);
      if (!node) {
        node = { title: part, children: [] };
        cursor.push(node);
      }
      if (isLeaf) {
        node.slug = meta.slug;
        node.type = meta.type;
        node.title = meta.title;
      } else {
        node.children = node.children || [];
        cursor = node.children;
      }
    }
  };

  docs
    .filter((d) => d.section === section)
    .sort((a, b) => a.title.localeCompare(b.title))
    .forEach((doc) => {
      const relative = doc.slug.slice(1).join("/");
      const parts = relative.split("/").filter(Boolean);
      insert(parts.length ? parts : [doc.title], doc);
    });

  return tree;
}

function scanFiles(section: SectionKey): DocMeta[] {
  const { dir, exclude } = SECTION_CONFIG[section] as { dir: string; exclude?: string[] };
  const root = path.join(BASE_DIR, dir);
  if (!fs.existsSync(root)) return [];

  const excludeDirs = (exclude || []).map((e) => path.join(root, e));
  const results: DocMeta[] = [];

  const walk = (current: string) => {
    // Skip excluded subdirectories
    if (excludeDirs.some((ex) => current === ex || current.startsWith(ex + path.sep))) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (isMarkdown(fullPath) || isPdf(fullPath)) {
        const rel = path.relative(root, fullPath);
        const slug = [section, ...rel.split(path.sep)].map((p) => p.replace(path.extname(p), ""));
        if (isPdf(fullPath)) {
          results.push({
            id: `${section}:${rel}`,
            title: path.basename(fullPath, path.extname(fullPath)),
            slug,
            filePath: fullPath,
            section,
            tags: [],
            type: "pdf",
            updatedAt: fs.statSync(fullPath).mtimeMs,
            excerpt: "",
          });
          continue;
        }
        const raw = fs.readFileSync(fullPath, "utf-8");
        const { data, content } = matter(raw);
        const title = data?.title ? String(data.title) : extractTitle(content, fullPath);
        const tags = extractTags(data, content);
        results.push({
          id: `${section}:${rel}`,
          title,
          slug,
          filePath: fullPath,
          section,
          tags,
          type: "markdown",
          updatedAt: fs.statSync(fullPath).mtimeMs,
          excerpt: extractExcerpt(content),
          content,
        });
      }
    }
  };

  walk(root);
  return results;
}

function buildSearchIndex(docs: DocMeta[]) {
  searchIndex = new FlexDocument({
    tokenize: "forward",
    document: {
      id: "id",
      index: ["title", "content", "excerpt", "tags"],
      store: ["title", "slug", "section", "tags", "type", "updatedAt", "excerpt"],
    },
  });

  docs.forEach((doc) => {
    searchIndex?.add(doc);
  });
}

async function buildIndexInternal() {
  const allDocs: DocMeta[] = [];
  (Object.keys(SECTION_CONFIG) as SectionKey[]).forEach((section) => {
    allDocs.push(...scanFiles(section));
  });
  docsCache = allDocs;
  navCache = {
    playbooks: buildNavForSection("playbooks", allDocs),
    pkb: buildNavForSection("pkb", allDocs),
    concepts: buildNavForSection("concepts", allDocs),
    manuals: buildNavForSection("manuals", allDocs),
  };
  buildSearchIndex(allDocs);
  indexReady = true;
}

export async function buildIndex() {
  if (buildInProgress) return buildInProgress;
  buildInProgress = buildIndexInternal().finally(() => {
    buildInProgress = null;
  });
  return buildInProgress;
}

function ensureWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;
  const watchPaths = (Object.keys(SECTION_CONFIG) as SectionKey[]).map((section) =>
    path.join(BASE_DIR, SECTION_CONFIG[section].dir)
  );
  const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });
  watcher.on("add", buildIndex);
  watcher.on("change", buildIndex);
  watcher.on("unlink", buildIndex);
  watcher.on("addDir", buildIndex);
  watcher.on("unlinkDir", buildIndex);
}

export async function getAllDocs() {
  if (!indexReady) await buildIndex();
  ensureWatcher();
  return docsCache.map((doc) => ({ ...doc, content: undefined }));
}

export async function getDocBySlug(slug: string[]) {
  if (!indexReady) await buildIndex();
  ensureWatcher();
  const doc = docsCache.find((d) => d.slug.join("/") === slug.join("/"));
  return doc ? { ...doc, content: undefined } : undefined;
}

export async function getNav() {
  if (!indexReady) await buildIndex();
  ensureWatcher();
  return navCache;
}

export async function searchDocs(query: string) {
  if (!indexReady) await buildIndex();
  ensureWatcher();
  if (!searchIndex || !query.trim()) return [];
  const results = searchIndex.search(query, { enrich: true, limit: 20 });
  const flat = results.flatMap((r) => r.result.map((res) => res.doc as DocMeta));
  const unique = new Map(flat.map((doc) => [doc.id, doc]));
  return Array.from(unique.values()).map((doc) => ({
    ...doc,
    content: undefined,
  }));
}

export async function getRawMarkdown(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);
  return { data, content };
}

export function getSectionConfig() {
  return SECTION_CONFIG;
}

export function slugifyHeading(value: string) {
  return slugify(value);
}
