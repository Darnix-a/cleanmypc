import * as fs from 'fs-extra';
import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';
import { CleanupResult } from '../CleanupManager';

export class DownloadsOrganizer extends BaseCleaner {
  async clean(): Promise<CleanupResult> {
    return this.organize();
  }

  async organize(): Promise<CleanupResult> {
    this.clearErrors();
    
    let filesOrganized = 0;
    let spaceSaved = 0; // No space is actually saved, but we track moved files

    if (!this.config.organizeDownloads.enabled) {
      return {
        task: 'downloads',
        filesDeleted: 0,
        spaceSaved: 0,
        filesOrganized: 0,
        errors: ['Downloads organization is disabled in config']
      };
    }

    const downloadsPath = this.config.downloadsPath;
    
    if (!(await this.pathExists(downloadsPath))) {
      this.errors.push(`Downloads folder not found: ${downloadsPath}`);
      return {
        task: 'downloads',
        filesDeleted: 0,
        spaceSaved: 0,
        filesOrganized: 0,
        errors: this.getErrors()
      };
    }

    try {
      // Get all files in downloads folder (not in subfolders)
      const files = await this.findFiles([path.join(downloadsPath, '*')]);
      
      for (const file of files) {
        const organized = await this.organizeFile(file, downloadsPath);
        if (organized) {
          filesOrganized++;
        }
      }

    } catch (error) {
      this.errors.push(`Error organizing downloads: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      task: 'downloads',
      filesDeleted: 0,
      spaceSaved: 0,
      filesOrganized,
      errors: this.getErrors()
    };
  }

  private async organizeFile(filePath: string, downloadsPath: string): Promise<boolean> {
    try {
      const fileName = path.basename(filePath);
      const fileExt = path.extname(fileName).toLowerCase();
      
      // Skip files without extensions or hidden files
      if (!fileExt || fileName.startsWith('.')) {
        return false;
      }

      // Find the appropriate category for this file
      const category = this.getCategoryForExtension(fileExt);
      
      if (!category) {
        // No category found, leave file where it is
        return false;
      }

      // Create category folder if it doesn't exist
      const categoryPath = path.join(downloadsPath, category);
      
      if (!this.dryRun) {
        await fs.ensureDir(categoryPath);
      }

      // Move file to category folder
      const newFilePath = path.join(categoryPath, fileName);
      
      // Check if file already exists in destination
      if (await this.pathExists(newFilePath)) {
        // Generate a unique name
        const uniqueFileName = await this.generateUniqueFileName(categoryPath, fileName);
        const uniqueFilePath = path.join(categoryPath, uniqueFileName);
        
        if (!this.dryRun) {
          await fs.move(filePath, uniqueFilePath);
        }
      } else {
        if (!this.dryRun) {
          await fs.move(filePath, newFilePath);
        }
      }

      return true;

    } catch (error) {
      this.errors.push(`Failed to organize file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private getCategoryForExtension(extension: string): string | null {
    const categories = this.config.organizeDownloads.categories;
    
    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }
    
    return null;
  }

  private async generateUniqueFileName(dirPath: string, fileName: string): Promise<string> {
    const name = path.parse(fileName).name;
    const ext = path.parse(fileName).ext;
    
    let counter = 1;
    let uniqueName = fileName;
    
    while (await this.pathExists(path.join(dirPath, uniqueName))) {
      uniqueName = `${name} (${counter})${ext}`;
      counter++;
    }
    
    return uniqueName;
  }
}
