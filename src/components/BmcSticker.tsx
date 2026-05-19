export default function BmcSticker() {
  return (
    <a
      href="https://ko-fi.com/P2V01ZT620"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 z-50 block rounded-md shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 sm:bottom-24 sm:right-6"
      title="Support on Ko-fi"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        height={36}
        src="https://storage.ko-fi.com/cdn/kofi2.png?v=6"
        alt="Buy Me a Coffee at ko-fi.com"
        className="h-9 border-0"
      />
    </a>
  );
}
