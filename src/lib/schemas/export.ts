import { z } from "zod";

export const ExportOverridesSchema = z.object({
  course: z.string().optional(),
  module: z.string().optional(),
  topic: z.string().optional(),
  status: z.string().optional(),
  archivePath: z.string().optional(),
  customTags: z.array(z.string()).optional(),
});

export type ExportOverrides = z.infer<typeof ExportOverridesSchema>;
