import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';
import { CleanupResult } from '../CleanupManager';
import { OSDetector } from '../utils/OSDetector';

export class LargeFileFinder extends BaseCleaner {
  async clean(): Promise<CleanupResult> {
    return this.find();
  }

  async find(): Promise<CleanupResult> {
    this.clearErrors();
    
    const largeFiles: Array<{ path: string; size: number }> = [];
    
    const searchPaths = this.getSearchPaths();
    
    for (const searchPath of searchPaths) {
      if (await this.pathExists(searchPath)) {
        const foundFiles = await this.findLargeFilesInPath(searchPath);
        largeFiles.push(...foundFiles);
      }
    }

    // Sort by size (largest first)
    largeFiles.sort((a, b) => b.size - a.size);

    return {
      task: 'largeFiles',
      filesDeleted: 0,
      spaceSaved: 0,
      largeFiles,
      errors: this.getErrors()
    };
  }

  private getSearchPaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    
    const paths: string[] = [homeDir];

    // Add common locations where large files might be found
    if (osType === 'windows') {
      paths.push(
        'C:\\Users',
        'C:\\Downloads',
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Videos'),
        path.join(homeDir, 'Pictures'),
        path.join(homeDir, 'Desktop')
      );
    } else if (osType === 'macos') {
      paths.push(
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Movies'),
        path.join(homeDir, 'Pictures'),
        path.join(homeDir, 'Desktop'),
        path.join(homeDir, 'Library'),
        '/Applications'
      );
    } else {
      paths.push(
        path.join(homeDir, 'Documents'),
        path.join(homeDir, 'Videos'),
        path.join(homeDir, 'Pictures'),
        path.join(homeDir, 'Desktop'),
        '/opt',
        '/usr/share'
      );
    }

    return paths.filter(p => p);
  }

  private async findLargeFilesInPath(searchPath: string): Promise<Array<{ path: string; size: number }>> {
    const largeFiles: Array<{ path: string; size: number }> = [];

    try {
      await this.traverseDirectory(searchPath, largeFiles, 0);
    } catch (error) {
      this.errors.push(`Error searching in ${searchPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return largeFiles;
  }

  private async traverseDirectory(
    dirPath: string, 
    largeFiles: Array<{ path: string; size: number }>, 
    depth: number
  ): Promise<void> {
    // Limit recursion depth to avoid infinite loops and performance issues
    if (depth > 10) {
      return;
    }

    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        // Skip system and hidden files/directories
        if (this.shouldSkipPath(itemPath, item.name)) {
          continue;
        }

        try {
          if (item.isFile()) {
            const stats = await fs.stat(itemPath);
            
            if (stats.size >= this.config.largeFileThreshold) {
              largeFiles.push({
                path: itemPath,
                size: stats.size
              });
            }
          } else if (item.isDirectory()) {
            // Recursively search subdirectories
            await this.traverseDirectory(itemPath, largeFiles, depth + 1);
          }
        } catch (error) {
          // Skip files/directories we can't access
          continue;
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }

  private shouldSkipPath(fullPath: string, itemName: string): boolean {
    const osType = OSDetector.getOS();
    
    // Skip hidden files and directories
    if (itemName.startsWith('.')) {
      return true;
    }

    // Skip system directories by name
    const systemDirs = [
      'System Volume Information',
      '$RECYCLE.BIN',
      'Windows',
      'Program Files',
      'Program Files (x86)',
      'ProgramData',
      'AppData',
      'node_modules',
      '.git',
      '.svn',
      '.hg'
    ];

    if (systemDirs.includes(itemName)) {
      return true;
    }

    // OS-specific system paths to skip
    if (osType === 'windows') {
      const windowsSkipPaths = [
        'C:\\Windows',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        'C:\\ProgramData'
      ];
      
      for (const skipPath of windowsSkipPaths) {
        if (fullPath.toLowerCase().startsWith(skipPath.toLowerCase())) {
          return true;
        }
      }
    } else if (osType === 'macos') {
      const macosSkipPaths = [
        '/System',
        '/Library/System',
        '/usr/bin',
        '/usr/sbin',
        '/bin',
        '/sbin'
      ];
      
      for (const skipPath of macosSkipPaths) {
        if (fullPath.startsWith(skipPath)) {
          return true;
        }
      }
    } else {
      const linuxSkipPaths = [
        '/bin',
        '/sbin',
        '/usr/bin',
        '/usr/sbin',
        '/lib',
        '/lib64',
        '/usr/lib',
        '/usr/lib64',
        '/sys',
        '/proc',
        '/dev'
      ];
      
      for (const skipPath of linuxSkipPaths) {
        if (fullPath.startsWith(skipPath)) {
          return true;
        }
      }
    }

    // Check if path is in exclusions
    for (const exclusion of this.config.exclusions) {
      if (fullPath.includes(exclusion)) {
        return true;
      }
    }

    return false;
  }

  // Method to actually delete large files (can be called separately)
  async deleteLargeFiles(filePaths: string[]): Promise<{ deletedCount: number; spaceSaved: number }> {
    let deletedCount = 0;
    let spaceSaved = 0;

    for (const filePath of filePaths) {
      const result = await this.deleteFile(filePath);
      if (result.deleted) {
        deletedCount++;
        spaceSaved += result.size;
      }
    }

    return { deletedCount, spaceSaved };
  }
}
