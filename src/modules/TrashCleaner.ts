import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';
import { CleanupResult } from '../CleanupManager';
import { OSDetector } from '../utils/OSDetector';

export class TrashCleaner extends BaseCleaner {
  async clean(): Promise<CleanupResult> {
    this.clearErrors();
    
    let filesDeleted = 0;
    let spaceSaved = 0;

    const trashPaths = this.getTrashPaths();
    
    for (const trashPath of trashPaths) {
      if (await this.pathExists(trashPath)) {
        const result = await this.cleanTrashPath(trashPath);
        filesDeleted += result.filesDeleted;
        spaceSaved += result.spaceSaved;
      }
    }

    return {
      task: 'trash',
      filesDeleted,
      spaceSaved,
      errors: this.getErrors()
    };
  }

  private getTrashPaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    
    const paths: string[] = [];

    if (osType === 'windows') {
      // Windows Recycle Bin locations
      const drives = ['C:', 'D:', 'E:', 'F:']; // Common drive letters
      
      for (const drive of drives) {
        paths.push(
          path.join(drive, '$Recycle.Bin'),
          path.join(drive, 'RECYCLER') // Older Windows versions
        );
      }
    } else if (osType === 'macos') {
      // macOS Trash locations
      paths.push(
        path.join(homeDir, '.Trash'),
        '/Volumes/*/.Trashes',
        '/.Trashes'
      );
    } else {
      // Linux Trash locations (following XDG specification)
      paths.push(
        path.join(homeDir, '.local', 'share', 'Trash'),
        '/tmp/.Trash-*'
      );
    }

    return paths.filter(p => p);
  }

  private async cleanTrashPath(trashPath: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    try {
      if (trashPath.includes('*')) {
        // Handle wildcard paths (like /Volumes/*/.Trashes)
        const matchingPaths = await this.findDirectories([trashPath]);
        
        for (const matchedPath of matchingPaths) {
          const result = await this.emptyTrashDirectory(matchedPath);
          filesDeleted += result.filesDeleted;
          spaceSaved += result.spaceSaved;
        }
      } else {
        // Handle direct paths
        if (await this.pathExists(trashPath)) {
          const result = await this.emptyTrashDirectory(trashPath);
          filesDeleted += result.filesDeleted;
          spaceSaved += result.spaceSaved;
        }
      }
    } catch (error) {
      this.errors.push(`Error cleaning trash path ${trashPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { filesDeleted, spaceSaved };
  }

  private async emptyTrashDirectory(trashPath: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    try {
      const osType = OSDetector.getOS();

      if (osType === 'windows') {
        // Windows Recycle Bin structure
        await this.cleanWindowsRecycleBin(trashPath);
      } else if (osType === 'macos') {
        // macOS Trash structure
        const trashFiles = await this.findFiles([path.join(trashPath, '**', '*')]);
        
        for (const file of trashFiles) {
          const result = await this.deleteFile(file);
          if (result.deleted) {
            filesDeleted++;
            spaceSaved += result.size;
          }
        }

        // Clean empty directories
        const trashDirs = await this.findDirectories([path.join(trashPath, '**')]);
        for (const dir of trashDirs.reverse()) { // Delete from deepest first
          if (await this.isDirectoryEmpty(dir)) {
            const result = await this.deleteDirectory(dir);
            if (result.deleted) {
              filesDeleted++;
            }
          }
        }
      } else {
        // Linux Trash structure (XDG specification)
        await this.cleanLinuxTrash(trashPath);
      }

    } catch (error) {
      this.errors.push(`Error emptying trash directory ${trashPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { filesDeleted, spaceSaved };
  }

  private async cleanWindowsRecycleBin(recycleBinPath: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    try {
      // Windows Recycle Bin has user-specific folders
      const userFolders = await this.findDirectories([path.join(recycleBinPath, 'S-*')]);
      
      for (const userFolder of userFolders) {
        // Delete all files in the user's recycle bin folder
        const files = await this.findFiles([path.join(userFolder, '**', '*')]);
        
        for (const file of files) {
          const result = await this.deleteFile(file);
          if (result.deleted) {
            filesDeleted++;
            spaceSaved += result.size;
          }
        }

        // Clean directories
        const dirs = await this.findDirectories([path.join(userFolder, '**')]);
        for (const dir of dirs.reverse()) {
          if (await this.isDirectoryEmpty(dir)) {
            const result = await this.deleteDirectory(dir);
            if (result.deleted) {
              filesDeleted++;
            }
          }
        }
      }
    } catch (error) {
      this.errors.push(`Error cleaning Windows Recycle Bin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { filesDeleted, spaceSaved };
  }

  private async cleanLinuxTrash(trashPath: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    try {
      // Linux trash has 'files' and 'info' directories
      const filesDir = path.join(trashPath, 'files');
      const infoDir = path.join(trashPath, 'info');

      // Clean files directory
      if (await this.pathExists(filesDir)) {
        const files = await this.findFiles([path.join(filesDir, '**', '*')]);
        
        for (const file of files) {
          const result = await this.deleteFile(file);
          if (result.deleted) {
            filesDeleted++;
            spaceSaved += result.size;
          }
        }

        // Clean directories in files
        const dirs = await this.findDirectories([path.join(filesDir, '**')]);
        for (const dir of dirs.reverse()) {
          if (await this.isDirectoryEmpty(dir)) {
            const result = await this.deleteDirectory(dir);
            if (result.deleted) {
              filesDeleted++;
            }
          }
        }
      }

      // Clean info directory (metadata files)
      if (await this.pathExists(infoDir)) {
        const infoFiles = await this.findFiles([path.join(infoDir, '*.trashinfo')]);
        
        for (const infoFile of infoFiles) {
          const result = await this.deleteFile(infoFile);
          if (result.deleted) {
            filesDeleted++;
            spaceSaved += result.size;
          }
        }
      }

    } catch (error) {
      this.errors.push(`Error cleaning Linux trash: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
