"use client";

export default function BmcSticker() {
  return (
    <a
      href="https://www.buymeacoffee.com/santapalabra"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 z-50 block transition hover:scale-105 sm:bottom-24 sm:right-6"
      title="Comprame un cafecito ☕"
    >
      <img
        src="/bmc-sticker.gif"
        alt="Comprame un cafecito"
        className="h-auto w-[100px] sm:w-[120px] drop-shadow-lg"
      />
    </a>
  );
}
