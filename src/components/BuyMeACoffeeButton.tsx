"use client";

import { useEffect, useRef } from "react";

export default function BuyMeACoffeeButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (injectedRef.current || !containerRef.current) return;
    injectedRef.current = true;

    const script = document.createElement("script");
    script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
    script.setAttribute("data-name", "bmc-button");
    script.setAttribute("data-slug", "santapalabra");
    script.setAttribute("data-color", "#FFDD00");
    script.setAttribute("data-emoji", "☕");
    script.setAttribute("data-font", "Arial");
    script.setAttribute("data-text", "Comprame un cafecito");
    script.setAttribute("data-outline-color", "#000000");
    script.setAttribute("data-font-color", "#000000");
    script.setAttribute("data-coffee-color", "#ffffff");
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
