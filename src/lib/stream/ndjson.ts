type NdjsonReader = {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
};

export type ReadNdjsonStreamOptions = {
  /** Invoked once per parsed JSON line, in order. May throw to abort the stream. */
  onValue: (value: unknown) => void | Promise<void>;
  /** Invoked after every successful read (e.g. to reset inactivity timeouts). */
  onRead?: () => void;
  /** Return false to stop consuming (e.g. component unmounted). */
  shouldContinue?: () => boolean;
};

/**
 * Consumes a newline-delimited JSON stream, handling chunks that split lines.
 * Malformed lines are skipped. The trailing buffer is flushed as a final line.
 */
export async function readNdjsonStream(
  reader: NdjsonReader,
  { onValue, onRead, shouldContinue = () => true }: ReadNdjsonStreamOptions,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = async (line: string) => {
    if (!line.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      console.error("Error parsing NDJSON line", error);
      return;
    }
    await onValue(parsed);
  };

  while (shouldContinue()) {
    const { done, value } = await reader.read();
    if (done) break;
    onRead?.();

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      await handleLine(line);
    }
  }

  if (buffer.trim()) {
    await handleLine(buffer);
  }
}
