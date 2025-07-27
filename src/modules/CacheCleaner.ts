import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';
import { CleanupResult } from '../CleanupManager';
import { OSDetector } from '../utils/OSDetector';

export class CacheCleaner extends BaseCleaner {
  async clean(): Promise<CleanupResult> {
    this.clearErrors();
    
    let filesDeleted = 0;
    let spaceSaved = 0;

    const cachePaths = this.getCachePaths();
    
    for (const cachePath of cachePaths) {
      if (await this.pathExists(cachePath)) {
        const result = await this.cleanCachePath(cachePath);
        filesDeleted += result.filesDeleted;
        spaceSaved += result.spaceSaved;
      }
    }

    return {
      task: 'cache',
      filesDeleted,
      spaceSaved,
      errors: this.getErrors()
    };
  }

  private getCachePaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    
    const paths: string[] = [];

    // Add OS-specific cache paths
    if (osType === 'windows') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const appData = process.env.APPDATA || '';
      
      paths.push(
        // Windows system caches
        path.join(localAppData, 'Microsoft', 'Windows', 'Explorer', 'thumbcache_*.db'),
        path.join(localAppData, 'Microsoft', 'Windows', 'WebCache'),
        path.join(localAppData, 'Microsoft', 'Windows', 'INetCache'),
        path.join(localAppData, 'IconCache.db'),
        
        // Application caches
        path.join(localAppData, 'npm-cache'),
        path.join(appData, 'npm-cache'),
        path.join(localAppData, 'yarn', 'cache'),
        path.join(localAppData, 'pip', 'cache'),
        path.join(localAppData, 'composer', 'cache'),
        
        // VS Code caches
        path.join(appData, 'Code', 'logs'),
        path.join(appData, 'Code', 'CachedData'),
        
        // JetBrains caches
        path.join(localAppData, 'JetBrains', '*', 'caches'),
        path.join(localAppData, 'JetBrains', '*', 'logs')
      );
    } else if (osType === 'macos') {
      paths.push(
        // macOS system caches
        path.join(homeDir, 'Library', 'Caches'),
        '/Library/Caches',
        '/System/Library/Caches',
        
        // Application caches
        path.join(homeDir, '.npm', '_cacache'),
        path.join(homeDir, '.yarn', 'cache'),
        path.join(homeDir, '.cache', 'pip'),
        path.join(homeDir, '.composer', 'cache'),
        
        // Development tool caches
        path.join(homeDir, 'Library', 'Caches', 'com.microsoft.VSCode'),
        path.join(homeDir, 'Library', 'Logs', 'DiagnosticReports'),
        path.join(homeDir, 'Library', 'Application Support', 'Code', 'logs')
      );
    } else { // Linux
      paths.push(
        // Linux system caches
        path.join(homeDir, '.cache'),
        '/var/cache',
        '/tmp',
        
        // Application caches
        path.join(homeDir, '.npm', '_cacache'),
        path.join(homeDir, '.yarn', 'cache'),
        path.join(homeDir, '.cache', 'pip'),
        path.join(homeDir, '.composer', 'cache'),
        
        // Development tool caches
        path.join(homeDir, '.config', 'Code', 'logs'),
        path.join(homeDir, '.vscode', 'extensions', '.obsolete')
      );
    }

    // Add custom cache paths from config
    paths.push(...this.config.customCachePaths);

    return paths.filter(p => p); // Remove empty strings
  }

  private async cleanCachePath(cachePath: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    try {
      // Check if this is a file pattern or directory
      if (cachePath.includes('*')) {
        // It's a file pattern
        const files = await this.findFiles([cachePath]);
        
        for (const file of files) {
          if (this.isFileOldEnough(file, this.config.maxFileAge)) {
            const result = await this.deleteFile(file);
            if (result.deleted) {
              filesDeleted++;
              spaceSaved += result.size;
            }
          }
        }
      } else {
        // It's a directory
        if (await this.pathExists(cachePath)) {
          const cacheFilePatterns = [
            path.join(cachePath, '**', '*.cache'),
            path.join(cachePath, '**', '*.log'),
            path.join(cachePath, '**', '*.tmp'),
            path.join(cachePath, '**', '*.temp'),
            path.join(cachePath, '**', '*~'),
            path.join(cachePath, '**', '*.bak')
          ];

          const files = await this.findFiles(cacheFilePatterns);
          
          for (const file of files) {
            if (this.isFileOldEnough(file, this.config.maxFileAge)) {
              const result = await this.deleteFile(file);
              if (result.deleted) {
                filesDeleted++;
                spaceSaved += result.size;
              }
            }
          }

          // Clean empty cache directories
          const emptyDirs = await this.findDirectories([path.join(cachePath, '**')]);
          for (const dir of emptyDirs) {
            if (await this.isDirectoryEmpty(dir)) {
              const result = await this.deleteDirectory(dir);
              if (result.deleted) {
                filesDeleted++;
              }
            }
          }
        }
      }

    } catch (error) {
      this.errors.push(`Error cleaning cache path ${cachePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { filesDeleted, spaceSaved };
  }

  private async isDirectoryEmpty(dirPath: string): Promise<boolean> {
    try {
      const items = await require('fs-extra').readdir(dirPath);
      return items.length === 0;
    } catch {
      return false;
    }
  }
}
