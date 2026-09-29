/** StatusBar — counterpart of vcl/source/window/status.cxx. */
import type { ReactNode } from "react";

export function StatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="vcl-statusbar" role="status">
      {children}
    </div>
  );
}

export function StatusBarItem({
  children,
  flex,
  title,
  width,
}: {
  children: ReactNode;
  flex?: boolean;
  title?: string;
  width?: number;
}) {
  return (
    <div className="vcl-statusbar-item" data-flex={flex ? "" : undefined} title={title} style={{ minWidth: width }}>
      {children}
    </div>
  );
}
