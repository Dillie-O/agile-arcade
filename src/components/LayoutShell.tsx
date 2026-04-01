import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function LayoutShell({ children }: Props) {
  return <div className="layout-shell">{children}</div>;
}