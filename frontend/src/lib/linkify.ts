import { createElement, type ReactNode } from "react";
import Link from "next/link";

/** Turn any StrKey addresses in a display string into links to their record. */
export function linkifyAddresses(text: string): ReactNode {
  const addressPattern = /\b([GC][A-Z2-7]{55})\b/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = addressPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const address = match[1];
    const isContract = address.startsWith("C");
    parts.push(
      createElement(
        Link,
        {
          key: match.index,
          href: isContract ? `/contract/${address}` : `/account/${address}`,
          className: "text-prism-accent hover:underline",
        },
        address
      )
    );
    lastIndex = match.index + address.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
