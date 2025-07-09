"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!ref.current || !chart) return;

      try {
        // Initialize mermaid
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });

        // Clear container
        ref.current.innerHTML = "";

        // Render diagram
        const { svg } = await mermaid.render(`diagram-${Date.now()}`, chart);
        ref.current.innerHTML = svg;
      } catch {
        ref.current.innerHTML = `<div style="color: red; padding: 20px;">Failed to render diagram</div>`;
      }
    };

    renderChart();
  }, [chart]);

  return <div ref={ref} className={className} />;
}
