type LogLevel = "info" | "warn" | "error" | "debug";

type LogPayload = {
  message: string;
  context?: Record<string, unknown>;
};

function write(level: LogLevel, payload: LogPayload) {
  const entry = {
    level,
    message: payload.message,
    context: payload.context ?? {},
    timestamp: new Date().toISOString(),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry, null, 2));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(entry, null, 2));
    return;
  }

  console.log(JSON.stringify(entry, null, 2));
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    write("info", { message, context });
  },
  warn(message: string, context?: Record<string, unknown>) {
    write("warn", { message, context });
  },
  error(message: string, context?: Record<string, unknown>) {
    write("error", { message, context });
  },
  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      write("debug", { message, context });
    }
  },
};
