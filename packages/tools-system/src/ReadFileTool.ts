import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ReadFileTool extends BaseTool<
  { path: string },
  { content: string; size: number }
> {
  name = 'system_read_file';
  description = 'Read the contents of a file from the disk and return its size in bytes.';
  namespace = 'system';
  schema = z.object({
    path: z.string().describe('The absolute or relative path to the file to read.')
  });

  async execute(input: { path: string }, context: AgentContext): Promise<{ content: string; size: number }> {
    const targetPath = path.resolve(process.cwd(), input.path);
    const content = await fs.readFile(targetPath, 'utf-8');
    const stat = await fs.stat(targetPath);
    return { content, size: stat.size };
  }
}
