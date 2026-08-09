import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function CurriculumText({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/  \n/g, "\n").split("\n");
  return (
    <div className="curriculum-text">
      {lines.map((line, index) => (
        <p key={index}>{inline(line || " ")}</p>
      ))}
    </div>
  );
}
