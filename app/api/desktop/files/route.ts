import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_BYTES = 10 * 1024 * 1024;
const MAX_LIST_ITEMS = 1000;

type ScopeKey = "imports" | "exports" | "backups";
type Operation = "list" | "read" | "write" | "delete" | "stat";

type RequestBody = {
  operation: Operation;
  scope: ScopeKey;
  relativePath?: string;
  contentText?: string;
  contentBase64?: string;
  overwrite?: boolean;
  createDirectories?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    if (process.env.DESKTOP_RUNTIME !== "1") {
      return NextResponse.json({ error: "Desktop file API is disabled." }, { status: 403 });
    }

    const expectedToken = process.env.DESKTOP_LOCAL_API_TOKEN;
    if (expectedToken) {
      const providedToken = req.headers.get("x-desktop-api-token");
      if (!providedToken || providedToken !== expectedToken) {
        return NextResponse.json({ error: "Unauthorized desktop file API request." }, { status: 401 });
      }
    }

    const body = (await req.json()) as Partial<RequestBody>;
    const operation = body.operation;
    const scope = body.scope;

    if (!isValidOperation(operation)) {
      return NextResponse.json({ error: "Invalid operation." }, { status: 400 });
    }

    if (!isValidScope(scope)) {
      return NextResponse.json({ error: "Invalid scope." }, { status: 400 });
    }

    const scopes = getScopes();
    const scopeRoot = scopes[scope];
    await mkdir(scopeRoot, { recursive: true });

    const targetPath = resolveSafePath(scopeRoot, body.relativePath ?? "");

    switch (operation) {
      case "list": {
        const targetStat = await stat(targetPath).catch(() => null);
        if (!targetStat) {
          return NextResponse.json({ error: "Path not found." }, { status: 404 });
        }
        if (!targetStat.isDirectory()) {
          return NextResponse.json({ error: "Target path is not a directory." }, { status: 400 });
        }

        const entries = await readdir(targetPath, { withFileTypes: true });
        const limited = entries.slice(0, MAX_LIST_ITEMS).map((entry) => ({
          name: entry.name,
          type: entry.isDirectory() ? "dir" : "file",
        }));

        return NextResponse.json({
          scope,
          relativePath: normalizeRelativePath(body.relativePath ?? ""),
          entries: limited,
          truncated: entries.length > MAX_LIST_ITEMS,
        });
      }

      case "read": {
        const fileStat = await stat(targetPath).catch(() => null);
        if (!fileStat) {
          return NextResponse.json({ error: "File not found." }, { status: 404 });
        }
        if (!fileStat.isFile()) {
          return NextResponse.json({ error: "Target path is not a file." }, { status: 400 });
        }

        const wantsBase64 = typeof body.contentBase64 === "string";
        if (!wantsBase64 && fileStat.size > MAX_TEXT_BYTES) {
          return NextResponse.json({ error: "File too large for text read." }, { status: 413 });
        }
        if (wantsBase64 && fileStat.size > MAX_BASE64_BYTES) {
          return NextResponse.json({ error: "File too large for base64 read." }, { status: 413 });
        }

        if (wantsBase64) {
          const buf = await readFile(targetPath);
          return NextResponse.json({
            scope,
            relativePath: normalizeRelativePath(body.relativePath ?? ""),
            contentBase64: buf.toString("base64"),
            size: fileStat.size,
            modifiedAt: fileStat.mtime.toISOString(),
          });
        }

        const text = await readFile(targetPath, "utf8");
        return NextResponse.json({
          scope,
          relativePath: normalizeRelativePath(body.relativePath ?? ""),
          contentText: text,
          size: fileStat.size,
          modifiedAt: fileStat.mtime.toISOString(),
        });
      }

      case "write": {
        const hasText = typeof body.contentText === "string";
        const hasBase64 = typeof body.contentBase64 === "string";
        if (!hasText && !hasBase64) {
          return NextResponse.json({ error: "Write requires contentText or contentBase64." }, { status: 400 });
        }
        if (hasText && hasBase64) {
          return NextResponse.json({ error: "Provide only one content format." }, { status: 400 });
        }

        const existing = await stat(targetPath).catch(() => null);
        if (existing && !body.overwrite) {
          return NextResponse.json({ error: "File exists. Set overwrite=true to replace it." }, { status: 409 });
        }
        if (existing && existing.isDirectory()) {
          return NextResponse.json({ error: "Cannot write to a directory path." }, { status: 400 });
        }

        if (body.createDirectories) {
          await mkdir(path.dirname(targetPath), { recursive: true });
        }

        if (hasText) {
          const text = body.contentText as string;
          const bytes = Buffer.byteLength(text, "utf8");
          if (bytes > MAX_TEXT_BYTES) {
            return NextResponse.json({ error: "Text payload exceeds size limit." }, { status: 413 });
          }
          await writeFile(targetPath, text, "utf8");
        } else {
          const base64 = body.contentBase64 as string;
          const buf = Buffer.from(base64, "base64");
          if (buf.byteLength > MAX_BASE64_BYTES) {
            return NextResponse.json({ error: "Binary payload exceeds size limit." }, { status: 413 });
          }
          await writeFile(targetPath, buf);
        }

        const updated = await stat(targetPath);
        return NextResponse.json({
          ok: true,
          scope,
          relativePath: normalizeRelativePath(body.relativePath ?? ""),
          size: updated.size,
          modifiedAt: updated.mtime.toISOString(),
        });
      }

      case "delete": {
        const existing = await stat(targetPath).catch(() => null);
        if (!existing) {
          return NextResponse.json({ error: "Path not found." }, { status: 404 });
        }

        if (existing.isDirectory()) {
          const children = await readdir(targetPath);
          if (children.length > 0) {
            return NextResponse.json({ error: "Directory is not empty." }, { status: 400 });
          }
        }

        await rm(targetPath, { recursive: false, force: false });
        return NextResponse.json({
          ok: true,
          scope,
          relativePath: normalizeRelativePath(body.relativePath ?? ""),
        });
      }

      case "stat": {
        const fileStat = await stat(targetPath).catch(() => null);
        if (!fileStat) {
          return NextResponse.json({ error: "Path not found." }, { status: 404 });
        }

        return NextResponse.json({
          scope,
          relativePath: normalizeRelativePath(body.relativePath ?? ""),
          isDirectory: fileStat.isDirectory(),
          isFile: fileStat.isFile(),
          size: fileStat.size,
          createdAt: fileStat.birthtime.toISOString(),
          modifiedAt: fileStat.mtime.toISOString(),
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (
      message.includes("Invalid") ||
      message.includes("traversal") ||
      message.includes("Absolute paths")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[desktop/files]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getScopes(): Record<ScopeKey, string> {
  const raw = process.env.DESKTOP_ALLOWED_DIRS_JSON;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<Record<ScopeKey, string>>;
      if (isAbsolutePathMap(parsed)) {
        return parsed;
      }
    } catch {
      // Fallback to default map if env var is malformed.
    }
  }

  const base = path.join(os.homedir(), "SynplixDesktopData");
  return {
    imports: path.join(base, "imports"),
    exports: path.join(base, "exports"),
    backups: path.join(base, "backups"),
  };
}

function resolveSafePath(scopeRoot: string, relativePath: string): string {
  const normalizedRelative = normalizeRelativePath(relativePath);
  if (path.isAbsolute(normalizedRelative)) {
    throw new Error("Absolute paths are not allowed.");
  }

  const resolved = path.resolve(scopeRoot, normalizedRelative || ".");
  const rel = path.relative(scopeRoot, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Path traversal attempt rejected.");
  }

  return resolved;
}

function normalizeRelativePath(input: string): string {
  const normalized = input.replace(/\\/g, "/").trim();
  if (!normalized || normalized === ".") {
    return "";
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Invalid relative path segments.");
  }

  return segments.join("/");
}

function isValidOperation(value: unknown): value is Operation {
  return value === "list" || value === "read" || value === "write" || value === "delete" || value === "stat";
}

function isValidScope(value: unknown): value is ScopeKey {
  return value === "imports" || value === "exports" || value === "backups";
}

function isAbsolutePathMap(value: Partial<Record<ScopeKey, string>>): value is Record<ScopeKey, string> {
  return Boolean(
    value.imports &&
      value.exports &&
      value.backups &&
      path.isAbsolute(value.imports) &&
      path.isAbsolute(value.exports) &&
      path.isAbsolute(value.backups)
  );
}