"use client";

const KOFI_ID = process.env.NEXT_PUBLIC_KOFI_ID || "P2V01ZT620";
const KOFI_ENABLED = process.env.NEXT_PUBLIC_KOFI_ENABLED !== "false" && process.env.NEXT_PUBLIC_KOFI_ENABLED !== "0";

export default function BuyMeACoffeeButton() {
  if (!KOFI_ENABLED) {
    return null;
  }

  return (
    <div className="flex justify-center px-3 py-4">
      <a
        href={`https://ko-fi.com/${KOFI_ID}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-md transition hover:-translate-y-0.5"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height={36}
          src="https://storage.ko-fi.com/cdn/kofi2.png?v=6"
          alt="Buy Me a Coffee at ko-fi.com"
          className="h-9 border-0"
        />
      </a>
    </div>
  );
}