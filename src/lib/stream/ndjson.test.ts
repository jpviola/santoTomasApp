import { describe, expect, it, vi } from "vitest";
import { readNdjsonStream } from "@/lib/stream/ndjson";

function readerFrom(chunks: string[]) {
  let index = 0;
  const encoder = new TextEncoder();
  return {
    read: async () =>
      index < chunks.length
        ? { done: false as const, value: encoder.encode(chunks[index++]) }
        : { done: true as const },
  };
}

describe("readNdjsonStream", () => {
  it("parses one JSON object per line", async () => {
    const values: unknown[] = [];
    await readNdjsonStream(readerFrom(['{"a":1}\n{"b":2}\n']), {
      onValue: (v) => {
        values.push(v);
      },
    });
    expect(values).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("reassembles lines split across chunks", async () => {
    const values: unknown[] = [];
    await readNdjsonStream(readerFrom(['{"type":"prog', 'ress","n":1}\n{"type":', '"result"}\n']), {
      onValue: (v) => {
        values.push(v);
      },
    });
    expect(values).toEqual([{ type: "progress", n: 1 }, { type: "result" }]);
  });

  it("flushes a trailing line without newline", async () => {
    const values: unknown[] = [];
    await readNdjsonStream(readerFrom(['{"a":1}\n{"last":true}']), {
      onValue: (v) => {
        values.push(v);
      },
    });
    expect(values).toEqual([{ a: 1 }, { last: true }]);
  });

  it("skips malformed lines and empty lines", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const values: unknown[] = [];
    await readNdjsonStream(readerFrom(['not-json\n\n{"ok":true}\n']), {
      onValue: (v) => {
        values.push(v);
      },
    });
    expect(values).toEqual([{ ok: true }]);
    errorSpy.mockRestore();
  });

  it("stops reading when shouldContinue returns false", async () => {
    const values: unknown[] = [];
    let reads = 0;
    await readNdjsonStream(readerFrom(['{"a":1}\n', '{"b":2}\n']), {
      onValue: (v) => {
        values.push(v);
      },
      onRead: () => {
        reads += 1;
      },
      shouldContinue: () => reads < 1,
    });
    expect(values).toEqual([{ a: 1 }]);
  });

  it("propagates errors thrown by onValue", async () => {
    await expect(
      readNdjsonStream(readerFrom(['{"type":"error"}\n']), {
        onValue: () => {
          throw new Error("stream error");
        },
      }),
    ).rejects.toThrow("stream error");
  });
});
