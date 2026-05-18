"use client";

import { useEffect, useRef } from "react";

export default function BuyMeACoffee() {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current || !containerRef.current) return;
    injectedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    script.dataset.name = "bmc-button";
    script.dataset.slug = "santapalabra";
    script.dataset.color = "#FFDD00";
    script.dataset.emoji = "☕";
    script.dataset.font = "Arial";
    script.dataset.text = "Comprame un cafecito";
    script.dataset.outlineColor = "#000000";
    script.dataset.fontColor = "#000000";
    script.dataset.coffeeColor = "#ffffff";
    script.async = true;

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current && script.parentNode === containerRef.current) {
        containerRef.current.removeChild(script);
        injectedRef.current = false;
      }
    };
  }, []);

  return <div ref={containerRef} className="flex justify-center px-3 py-4" />;
}
