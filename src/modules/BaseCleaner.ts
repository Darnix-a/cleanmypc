import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'fast-glob';
import { CleanupConfig } from '../utils/ConfigManager';
import { CleanupResult } from '../CleanupManager';

export abstract class BaseCleaner {
  protected errors: string[] = [];

  constructor(
    protected config: CleanupConfig,
    protected dryRun: boolean = false,
    protected debug: boolean = false
  ) {}

  abstract clean(): Promise<CleanupResult>;

  protected async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  protected async deleteFile(filePath: string): Promise<{ deleted: boolean; size: number }> {
    try {
      const size = await this.getFileSize(filePath);
      
      if (!this.dryRun) {
        // Check if file exists and is accessible
        await fs.access(filePath, fs.constants.W_OK);
        await fs.remove(filePath);
      }
      
      return { deleted: true, size };
    } catch (error) {
      this.errors.push(`Failed to delete ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { deleted: false, size: 0 };
    }
  }

  protected async deleteDirectory(dirPath: string): Promise<{ deleted: boolean; size: number }> {
    try {
      const size = await this.getDirectorySize(dirPath);
      
      if (!this.dryRun) {
        await fs.remove(dirPath);
      }
      
      return { deleted: true, size };
    } catch (error) {
      this.errors.push(`Failed to delete directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { deleted: false, size: 0 };
    }
  }

  protected async getDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch {
      return 0;
    }
  }

  protected async findFiles(patterns: string[], excludePatterns: string[] = []): Promise<string[]> {
    try {
      if (this.debug) {
        console.log(`DEBUG: BaseCleaner.findFiles called with patterns:`, patterns);
        console.log(`DEBUG: BaseCleaner.findFiles excludePatterns:`, excludePatterns);
        console.log(`DEBUG: BaseCleaner.findFiles config.exclusions:`, this.config.exclusions);
      }
      
      // Convert Windows backslashes to forward slashes for fast-glob
      const normalizedPatterns = patterns.map(pattern => pattern.replace(/\\/g, '/'));
      const normalizedExcludes = excludePatterns.map(pattern => pattern.replace(/\\/g, '/'));
      const normalizedConfigExclusions = this.config.exclusions.map(pattern => pattern.replace(/\\/g, '/'));
      
      if (this.debug) {
        console.log(`DEBUG: Normalized patterns:`, normalizedPatterns);
      }
      
      const files = await glob(normalizedPatterns, {
        ignore: [...normalizedExcludes, ...normalizedConfigExclusions],
        absolute: true,
        onlyFiles: true
      });
      
      if (this.debug) {
        console.log(`DEBUG: BaseCleaner.findFiles found:`, files.length, 'files');
        if (files.length > 0) {
          console.log(`DEBUG: First few files:`, files.slice(0, 5));
        }
      }
      
      return files;
    } catch (error) {
      if (this.debug) {
        console.log(`DEBUG: BaseCleaner.findFiles error:`, error);
      }
      this.errors.push(`Failed to find files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  protected async findDirectories(patterns: string[], excludePatterns: string[] = []): Promise<string[]> {
    try {
      const dirs = await glob(patterns, {
        ignore: [...excludePatterns, ...this.config.exclusions],
        absolute: true,
        onlyDirectories: true
      });
      return dirs;
    } catch (error) {
      this.errors.push(`Failed to find directories: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  protected isFileOldEnough(filePath: string, maxAgeInDays: number): boolean {
    if (maxAgeInDays === 0) return true; // No age limit
    
    try {
      const stats = fs.statSync(filePath);
      const fileAge = Date.now() - stats.mtime.getTime();
      const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      
      return fileAge > maxAge;
    } catch {
      return false;
    }
  }

  protected async pathExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  protected getErrors(): string[] {
    return [...this.errors];
  }

  protected clearErrors(): void {
    this.errors = [];
  }
}
