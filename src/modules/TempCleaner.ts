import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';
import { CleanupResult } from '../CleanupManager';
import { OSDetector } from '../utils/OSDetector';

export class TempCleaner extends BaseCleaner {
  async clean(): Promise<CleanupResult> {
    this.clearErrors();
    
    let filesDeleted = 0;
    let spaceSaved = 0;

    const tempPaths = this.getTempPaths();
    
    for (const tempPath of tempPaths) {
      if (await this.pathExists(tempPath)) {
        const result = await this.cleanTempPath(tempPath);
        filesDeleted += result.filesDeleted;
        spaceSaved += result.spaceSaved;
      }
    }

    return {
      task: 'temp',
      filesDeleted,
      spaceSaved,
      errors: this.getErrors()
    };
  }

  private getTempPaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    const tempDir = OSDetector.getTempDirectory();
    
    const paths: string[] = [tempDir];

    // Add OS-specific temp paths
    if (osType === 'windows') {
      paths.push(
        path.join(process.env.LOCALAPPDATA || '', 'Temp'),
        path.join(process.env.APPDATA || '', 'Local', 'Temp'),
        'C:\\Windows\\Temp',
        'C:\\Windows\\SoftwareDistribution\\Download',
        'C:\\Windows\\Prefetch'
      );
    } else if (osType === 'macos') {
      paths.push(
        '/tmp',
        path.join(homeDir, 'Library', 'Caches'),
        '/var/tmp',
        '/private/tmp'
      );
    } else { // Linux
      paths.push(
        '/tmp',
        '/var/tmp',
        path.join(homeDir, '.cache')
      );
    }

    // Add custom temp paths from config
    paths.push(...this.config.customTempPaths);

    return paths.filter(p => p); // Remove empty strings
  }

  private async cleanTempPath(tempPath: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    try {
      if (this.debug) {
        console.log(`DEBUG: Cleaning temp path: ${tempPath}`);
      }
      
      // Find temp files - look for common temp file patterns
      const tempFilePatterns = [
        // Direct temp files
        path.join(tempPath, '*.tmp'),
        path.join(tempPath, '*.temp'),
        path.join(tempPath, '*~'),
        path.join(tempPath, '*.log'),
        path.join(tempPath, '*.bak'),
        path.join(tempPath, '*.old'),
        path.join(tempPath, '*.cache'),
        
        // Recursive patterns for temp directories
        path.join(tempPath, '**', '*.tmp'),
        path.join(tempPath, '**', '*.temp'),
        path.join(tempPath, '**', '*.log'),
        path.join(tempPath, '**', '*.cache'),
        path.join(tempPath, '**', '*~'),
        
        // Browser temp files
        path.join(tempPath, 'Temporary Internet Files', '**', '*'),
        path.join(tempPath, 'IETldCache', '**', '*'),
        
        // Common temp directory patterns
        path.join(tempPath, 'chrome_*', '**', '*'),
        path.join(tempPath, 'tmp*', '**', '*'),
        path.join(tempPath, '*_tmp', '**', '*'),
        
        // Files directly in temp folders that look temporary
        path.join(tempPath, '*tmp*'),
        path.join(tempPath, '*temp*'),
        path.join(tempPath, '*cache*')
      ];

      if (this.debug) {
        console.log(`DEBUG: Looking for patterns:`, tempFilePatterns);
      }

      const files = await this.findFiles(tempFilePatterns);
      
      if (this.debug) {
        console.log(`DEBUG: Found ${files.length} files matching patterns`);
      }
      
      for (const file of files) {
        if (this.debug) {
          console.log(`DEBUG: Processing file: ${file}`);
        }
        // Only delete files that are old enough
        if (this.isFileOldEnough(file, this.config.maxFileAge)) {
          const result = await this.deleteFile(file);
          if (result.deleted) {
            filesDeleted++;
            spaceSaved += result.size;
            if (this.debug) {
              console.log(`DEBUG: ${this.dryRun ? 'Would delete' : 'Deleted'} file: ${file} (${result.size} bytes)`);
            }
          }
        } else {
          if (this.debug) {
            console.log(`DEBUG: Skipping file (not old enough): ${file}`);
          }
        }
      }

      // Clean empty temp directories
      const tempDirPatterns = [
        path.join(tempPath, '*/')
      ];

      const dirs = await this.findDirectories(tempDirPatterns);
      
      for (const dir of dirs) {
        if (await this.isDirectoryEmpty(dir)) {
          const result = await this.deleteDirectory(dir);
          if (result.deleted) {
            // Directory deletion is counted as 1 file for simplicity
            filesDeleted++;
          }
        }
      }

    } catch (error) {
      this.errors.push(`Error cleaning temp path ${tempPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
