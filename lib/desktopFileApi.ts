export type DesktopFileScope = "imports" | "exports" | "backups";
export type DesktopFileOperation = "list" | "read" | "write" | "delete" | "stat";

type BaseRequest = {
  operation: DesktopFileOperation;
  scope: DesktopFileScope;
  relativePath?: string;
};

type WriteRequest = BaseRequest & {
  operation: "write";
  contentText?: string;
  contentBase64?: string;
  overwrite?: boolean;
  createDirectories?: boolean;
};

type GenericRequest = BaseRequest & {
  contentText?: string;
  contentBase64?: string;
  overwrite?: boolean;
  createDirectories?: boolean;
};

export function isDesktopRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const maybeNw = window as typeof window & { nw?: unknown };
  return Boolean(maybeNw.nw);
}

export async function callDesktopFileApi(payload: GenericRequest | WriteRequest) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("desktopApiToken") ?? ""
      : "";

  const response = await fetch("/api/desktop/files", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-desktop-api-token": token } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const errorMessage = typeof data.error === "string" ? data.error : "Desktop file API failed.";
    throw new Error(errorMessage);
  }

  return data;
}
