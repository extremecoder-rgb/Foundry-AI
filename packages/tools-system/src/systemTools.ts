import { BaseTool, AgentContext } from '@foundry/agent-core';
import { z } from 'zod';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

export class WriteFileTool extends BaseTool<
  { filePath: string; content: string },
  { success: boolean; bytesWritten: number; fullPath: string }
> {
  name = 'system_write_file';
  description = 'Write text content to a file on disk, creating parent directories if needed.';
  namespace = 'system';
  schema = z.object({ filePath: z.string(), content: z.string() });
  async execute(input: { filePath: string; content: string }, context: AgentContext) {
    const fullPath = path.resolve(input.filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, input.content, 'utf-8');
    const stat = await fs.stat(fullPath);
    return { success: true, bytesWritten: stat.size, fullPath };
  }
}

export class ListDirTool extends BaseTool<
  { dirPath: string; includeHidden?: boolean },
  { files: { name: string; isDirectory: boolean; size: number }[]; count: number }
> {
  name = 'system_list_dir';
  description = 'List all files and folders in a directory with metadata. Skips hidden files unless includeHidden is true.';
  namespace = 'system';
  schema = z.object({
    dirPath: z.string(),
    includeHidden: z.boolean().optional()
  });
  async execute(input: { dirPath: string; includeHidden?: boolean }, context: AgentContext) {
    const fullPath = path.resolve(input.dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const visible = input.includeHidden ? entries : entries.filter(e => !e.name.startsWith('.'));
    const files = await Promise.all(visible.map(async e => {
      let size = 0;
      if (e.isFile()) {
        try { size = (await fs.stat(path.join(fullPath, e.name))).size; } catch { /* ignore */ }
      }
      return { name: e.name, isDirectory: e.isDirectory(), size };
    }));
    return { files, count: files.length };
  }
}

export class SearchDirTool extends BaseTool<
  { dirPath: string; query: string; recursive?: boolean },
  { matches: string[]; scanned: number }
> {
  name = 'system_search_dir';
  description = 'Search for files in a directory whose name contains the query string. Recursive search supported.';
  namespace = 'system';
  schema = z.object({
    dirPath: z.string(),
    query: z.string(),
    recursive: z.boolean().optional()
  });
  async execute(input: { dirPath: string; query: string; recursive?: boolean }, context: AgentContext) {
    const fullPath = path.resolve(input.dirPath);
    const matches: string[] = [];
    let scanned = 0;
    const walk = async (dir: string) => {
      let entries;
      try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
      for (const entry of entries) {
        scanned++;
        if (entry.name.toLowerCase().includes(input.query.toLowerCase())) {
          matches.push(path.join(dir, entry.name));
        }
        if (input.recursive && entry.isDirectory() && !entry.name.startsWith('.')) {
          await walk(path.join(dir, entry.name));
        }
        if (matches.length >= 100) return;
      }
    };
    await walk(fullPath);
    return { matches, scanned };
  }
}

export class FileMetadataTool extends BaseTool<
  { filePath: string },
  { size: number; mtime: string; isFile: boolean; exists: boolean }
> {
  name = 'system_file_metadata';
  description = 'Get metadata (size, last modified time, type) of a file or directory.';
  namespace = 'system';
  schema = z.object({ filePath: z.string() });
  async execute(input: { filePath: string }, context: AgentContext) {
    const fullPath = path.resolve(input.filePath);
    try {
      const stats = await fs.stat(fullPath);
      return { size: stats.size, mtime: stats.mtime.toISOString(), isFile: stats.isFile(), exists: true };
    } catch {
      return { size: 0, mtime: '', isFile: false, exists: false };
    }
  }
}

export class MakeDirTool extends BaseTool<
  { dirPath: string },
  { success: boolean; fullPath: string }
> {
  name = 'system_make_dir';
  description = 'Create a directory recursively (creates parent directories as needed).';
  namespace = 'system';
  schema = z.object({ dirPath: z.string() });
  async execute(input: { dirPath: string }, context: AgentContext) {
    const fullPath = path.resolve(input.dirPath);
    await fs.mkdir(fullPath, { recursive: true });
    return { success: true, fullPath };
  }
}

export class DeleteFileTool extends BaseTool<
  { filePath: string; recursive?: boolean },
  { success: boolean; deleted: string }
> {
  name = 'system_delete_file';
  description = 'Delete a file (or directory if recursive=true) from disk.';
  namespace = 'system';
  schema = z.object({ filePath: z.string(), recursive: z.boolean().optional() });
  async execute(input: { filePath: string; recursive?: boolean }, context: AgentContext) {
    const fullPath = path.resolve(input.filePath);
    if (input.recursive) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }
    return { success: true, deleted: fullPath };
  }
}

export class CheckDiskSpaceTool extends BaseTool<
  {},
  { freeMb: number; totalMb: number; platform: string; method: 'os_query' | 'fallback' }
> {
  name = 'system_check_disk_space';
  description = 'Check free and total disk space available on the host. Uses platform-native commands (wmic on Windows, df on Unix).';
  namespace = 'system';
  schema = z.object({});
  async execute(input: {}, context: AgentContext) {
    const platform = process.platform;
    try {
      if (platform === 'win32') {
        const { stdout } = await execAsync('wmic logicaldisk where "DeviceID=\'%CURRENTDRIVE%\'" get FreeSpace,Size /value', { timeout: 5000 });
        const freeMatch = stdout.match(/FreeSpace=(\d+)/);
        const sizeMatch = stdout.match(/Size=(\d+)/);
        if (freeMatch && sizeMatch) {
          return {
            freeMb: Math.round(parseInt(freeMatch[1], 10) / (1024 * 1024)),
            totalMb: Math.round(parseInt(sizeMatch[1], 10) / (1024 * 1024)),
            platform,
            method: 'os_query' as const
          };
        }
      } else {
        const { stdout } = await execAsync('df -k . | tail -1', { timeout: 5000 });
        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 4) {
          return {
            freeMb: Math.round(parseInt(parts[3], 10) / 1024),
            totalMb: Math.round(parseInt(parts[1], 10) / 1024),
            platform,
            method: 'os_query' as const
          };
        }
      }
    } catch (e: any) {
      // fall through to fallback
    }
    return { freeMb: 0, totalMb: 0, platform, method: 'fallback' as const };
  }
}

export class GetEnvTool extends BaseTool<
  { name: string },
  { value: string | undefined; name: string; exists: boolean }
> {
  name = 'system_get_env';
  description = 'Get an environment variable value and whether it is set.';
  namespace = 'system';
  schema = z.object({ name: z.string() });
  async execute(input: { name: string }, context: AgentContext) {
    const value = process.env[input.name];
    return { value, name: input.name, exists: value !== undefined };
  }
}

export class RenameFileTool extends BaseTool<
  { oldPath: string; newPath: string },
  { success: boolean; from: string; to: string }
> {
  name = 'system_rename_file';
  description = 'Move or rename a file or directory.';
  namespace = 'system';
  schema = z.object({ oldPath: z.string(), newPath: z.string() });
  async execute(input: { oldPath: string; newPath: string }, context: AgentContext) {
    const oldF = path.resolve(input.oldPath);
    const newF = path.resolve(input.newPath);
    await fs.mkdir(path.dirname(newF), { recursive: true });
    await fs.rename(oldF, newF);
    return { success: true, from: oldF, to: newF };
  }
}

export class ZipFolderTool extends BaseTool<
  { dirPath: string; zipPath: string },
  { success: boolean; method: string; outputPath: string; size?: number }
> {
  name = 'system_zip_folder';
  description = 'Create a zip archive of a folder using PowerShell Compress-Archive (Windows) or system zip command (Unix).';
  namespace = 'system';
  schema = z.object({ dirPath: z.string(), zipPath: z.string() });
  async execute(input: { dirPath: string; zipPath: string }, context: AgentContext) {
    const dir = path.resolve(input.dirPath);
    const zip = path.resolve(input.zipPath);
    await fs.mkdir(path.dirname(zip), { recursive: true });
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -Command "Compress-Archive -Path '${dir}\\*' -DestinationPath '${zip}' -Force"`;
      await execAsync(cmd, { timeout: 30000 });
    } else {
      const cmd = `cd "${path.dirname(dir)}" && zip -r "${zip}" "${path.basename(dir)}"`;
      await execAsync(cmd, { timeout: 30000 });
    }
    const stat = await fs.stat(zip).catch(() => null);
    return { success: true, method: process.platform === 'win32' ? 'powershell_compress_archive' : 'zip', outputPath: zip, size: stat?.size };
  }
}

export class UnzipFolderTool extends BaseTool<
  { zipPath: string; destPath: string },
  { success: boolean; method: string; extractedTo: string; filesExtracted?: number }
> {
  name = 'system_unzip_folder';
  description = 'Extract a zip archive into a destination folder using PowerShell Expand-Archive (Windows) or unzip (Unix).';
  namespace = 'system';
  schema = z.object({ zipPath: z.string(), destPath: z.string() });
  async execute(input: { zipPath: string; destPath: string }, context: AgentContext) {
    const zip = path.resolve(input.zipPath);
    const dest = path.resolve(input.destPath);
    await fs.mkdir(dest, { recursive: true });
    if (process.platform === 'win32') {
      const cmd = `powershell -NoProfile -Command "Expand-Archive -Path '${zip}' -DestinationPath '${dest}' -Force"`;
      await execAsync(cmd, { timeout: 30000 });
    } else {
      const cmd = `unzip -o "${zip}" -d "${dest}"`;
      await execAsync(cmd, { timeout: 30000 });
    }
    const files = await fs.readdir(dest).catch(() => []);
    return { success: true, method: process.platform === 'win32' ? 'powershell_expand_archive' : 'unzip', extractedTo: dest, filesExtracted: files.length };
  }
}
