"use client";

import { useState } from "react";

type FrameworkExample = {
  label: string;
  code: string;
};

type FrameworkTabsProps = {
  examples: FrameworkExample[];
};

export function FrameworkTabs({ examples }: FrameworkTabsProps) {
  const [activeLabel, setActiveLabel] = useState(examples[0]?.label ?? "");
  const activeExample =
    examples.find((example) => example.label === activeLabel) ?? examples[0] ?? null;

  if (!activeExample) {
    return null;
  }

  return (
    <div className="framework-tabs">
      <div className="tab-buttons" role="tablist" aria-label="Framework examples">
        {examples.map((example) => (
          <button
            aria-selected={example.label === activeExample.label}
            className={`tab-button ${example.label === activeExample.label ? "tab-button-active" : ""}`}
            key={example.label}
            onClick={() => setActiveLabel(example.label)}
            role="tab"
            type="button"
          >
            {example.label}
          </button>
        ))}
      </div>

      <article className="tab-panel" role="tabpanel">
        <pre>{activeExample.code}</pre>
      </article>
    </div>
  );
}
