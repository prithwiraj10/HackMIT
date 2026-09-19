import Link from "next/link";
import { Activity } from "lucide-react";

export function TitleBar({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="title-bar">
      <Link className="title-brand" href="/">
        <span className="brand-mark">
          <Activity size={20} />
        </span>
        <span>
          freshman<span className="brand-light">flu</span>
        </span>
      </Link>
      <span className="title-divider" />
      <h1>{title}</h1>
      {action}
    </header>
  );
}
