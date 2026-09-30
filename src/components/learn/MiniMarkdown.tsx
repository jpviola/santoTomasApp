import { Fragment } from "react";

/** Negritas (**x**) e itálicas (*x*) como nodos de React, sin HTML crudo. */
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key} className="font-semibold text-[var(--foreground)]">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Subconjunto de Markdown que usa el tutor: párrafos, listas, negrita e itálica. */
export default function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).filter((block) => block.trim());

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((line) => line.trim());
        const isList = lines.length > 0 && lines.every((line) => LIST_ITEM.test(line));
        const ordered = isList && /^\s*\d/.test(lines[0]);

        if (isList) {
          const ListTag = ordered ? "ol" : "ul";
          return (
            <ListTag key={blockIndex} className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInline(line.replace(LIST_ITEM, ""), `${blockIndex}-${lineIndex}`)}</li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={blockIndex}>
            {lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {renderInline(line, `${blockIndex}-${lineIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
