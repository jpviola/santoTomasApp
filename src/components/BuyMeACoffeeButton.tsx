"use client";

const KOFI_ID = process.env.NEXT_PUBLIC_KOFI_ID || "P2V01ZT620";
const KOFI_ENABLED = process.env.NEXT_PUBLIC_KOFI_ENABLED !== "false" && process.env.NEXT_PUBLIC_KOFI_ENABLED !== "0";

type BuyMeACoffeeButtonProps = {
  compact?: boolean;
};

export default function BuyMeACoffeeButton({ compact = false }: BuyMeACoffeeButtonProps) {
  if (!KOFI_ENABLED) {
    return null;
  }

  return (
    <div className={compact ? "flex justify-center" : "flex justify-center px-2 py-2.5"}>
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
          className={compact ? "h-7 border-0" : "h-8 border-0"}
        />
      </a>
    </div>
  );
}
