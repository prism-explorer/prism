// Minimal ambient types for server rendering used by component tests.
// @types/react-dom is not installed in this workspace.
declare module "react-dom/server" {
  import type { ReactNode } from "react";
  export function renderToStaticMarkup(element: ReactNode): string;
  export function renderToString(element: ReactNode): string;
}
