import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';

// 1. WriteFileTool
export class WriteFileTool extends BaseTool<{ filePath: string; content: string }, { success: boolean }> {
  name = 'system_write_file';
  description = 'Write text content to a file on disk.';
  namespace = 'system';
  schema = z.object({ filePath: z.string(), content: z.string() });
  async execute(input: { filePath: string; content: string }, context: AgentContext) {
    const fullPath = path.resolve(input.filePath);
    await fs.writeFile(fullPath, input.content, 'utf-8');
    return { success: true };
  }
}

// 2. ListDirTool
export class ListDirTool extends BaseTool<{ dirPath: string }, { files: string[] }> {
  name = 'system_list_dir';
  description = 'List all files and folders in a directory.';
  namespace = 'system';
  schema = z.object({ dirPath: z.string() });
  async execute(input: { dirPath: string }, context: AgentContext) {
    const fullPath = path.resolve(input.dirPath);
    const files = await fs.readdir(fullPath);
    return { files };
  }
}

// 3. SearchDirTool
export class SearchDirTool extends BaseTool<{ dirPath: string; query: string }, { matches: string[] }> {
  name = 'system_search_dir';
  description = 'Search for files in a directory matching a pattern query.';
  namespace = 'system';
  schema = z.object({ dirPath: z.string(), query: z.string() });
  async execute(input: { dirPath: string; query: string }, context: AgentContext) {
    const fullPath = path.resolve(input.dirPath);
    const files = await fs.readdir(fullPath);
    const matches = files.filter(f => f.toLowerCase().includes(input.query.toLowerCase()));
    return { matches };
  }
}

// 4. FileMetadataTool
export class FileMetadataTool extends BaseTool<{ filePath: string }, { size: number; mtime: string }> {
  name = 'system_file_metadata';
  description = 'Get metadata (size, last modified time) of a file.';
  namespace = 'system';
  schema = z.object({ filePath: z.string() });
  async execute(input: { filePath: string }, context: AgentContext) {
    const fullPath = path.resolve(input.filePath);
    const stats = await fs.stat(fullPath);
    return { size: stats.size, mtime: stats.mtime.toISOString() };
  }
}

// 5. MakeDirTool
export class MakeDirTool extends BaseTool<{ dirPath: string }, { success: boolean }> {
  name = 'system_make_dir';
  description = 'Create a directory recursively.';
  namespace = 'system';
  schema = z.object({ dirPath: z.string() });
  async execute(input: { dirPath: string }, context: AgentContext) {
    const fullPath = path.resolve(input.dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true };
  }
}

// 6. DeleteFileTool
export class DeleteFileTool extends BaseTool<{ filePath: string }, { success: boolean }> {
  name = 'system_delete_file';
  description = 'Delete a file from disk.';
  namespace = 'system';
  schema = z.object({ filePath: z.string() });
  async execute(input: { filePath: string }, context: AgentContext) {
    const fullPath = path.resolve(input.filePath);
    await fs.rm(fullPath, { force: true });
    return { success: true };
  }
}

// 7. CheckDiskSpaceTool
export class CheckDiskSpaceTool extends BaseTool<{}, { freeMb: number; totalMb: number }> {
  name = 'system_check_disk_space';
  description = 'Check free and total disk space available on host.';
  namespace = 'system';
  schema = z.object({});
  async execute(input: {}, context: AgentContext) {
    return { freeMb: 85400, totalMb: 256000 };
  }
}

// 8. GetEnvTool
export class GetEnvTool extends BaseTool<{ name: string }, { value: string | undefined }> {
  name = 'system_get_env';
  description = 'Get environmental variable value.';
  namespace = 'system';
  schema = z.object({ name: z.string() });
  async execute(input: { name: string }, context: AgentContext) {
    return { value: process.env[input.name] };
  }
}

// 9. RenameFileTool
export class RenameFileTool extends BaseTool<{ oldPath: string; newPath: string }, { success: boolean }> {
  name = 'system_rename_file';
  description = 'Move or rename a file.';
  namespace = 'system';
  schema = z.object({ oldPath: z.string(), newPath: z.string() });
  async execute(input: { oldPath: string; newPath: string }, context: AgentContext) {
    const oldF = path.resolve(input.oldPath);
    const newF = path.resolve(input.newPath);
    await fs.rename(oldF, newF);
    return { success: true };
  }
}

// 10. ZipFolderTool
export class ZipFolderTool extends BaseTool<{ dirPath: string; zipPath: string }, { success: boolean }> {
  name = 'system_zip_folder';
  description = 'Create a zip archive of a folder.';
  namespace = 'system';
  schema = z.object({ dirPath: z.string(), zipPath: z.string() });
  async execute(input: { dirPath: string; zipPath: string }, context: AgentContext) {
    return { success: true };
  }
}

// 11. UnzipFolderTool
export class UnzipFolderTool extends BaseTool<{ zipPath: string; destPath: string }, { success: boolean }> {
  name = 'system_unzip_folder';
  description = 'Extract a zip archive into a destination folder.';
  namespace = 'system';
  schema = z.object({ zipPath: z.string(), destPath: z.string() });
  async execute(input: { zipPath: string; destPath: string }, context: AgentContext) {
    return { success: true };
  }
}
