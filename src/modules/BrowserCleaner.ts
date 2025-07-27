import * as path from 'path';
import { BaseCleaner } from './BaseCleaner';
import { CleanupResult } from '../CleanupManager';
import { OSDetector } from '../utils/OSDetector';

export class BrowserCleaner extends BaseCleaner {
  async clean(): Promise<CleanupResult> {
    this.clearErrors();
    
    let filesDeleted = 0;
    let spaceSaved = 0;

    // Clean each enabled browser
    if (this.config.browsers.chrome) {
      const result = await this.cleanChrome();
      filesDeleted += result.filesDeleted;
      spaceSaved += result.spaceSaved;
    }

    if (this.config.browsers.firefox) {
      const result = await this.cleanFirefox();
      filesDeleted += result.filesDeleted;
      spaceSaved += result.spaceSaved;
    }

    if (this.config.browsers.edge) {
      const result = await this.cleanEdge();
      filesDeleted += result.filesDeleted;
      spaceSaved += result.spaceSaved;
    }

    if (this.config.browsers.safari && OSDetector.isMacOS()) {
      const result = await this.cleanSafari();
      filesDeleted += result.filesDeleted;
      spaceSaved += result.spaceSaved;
    }

    return {
      task: 'browsers',
      filesDeleted,
      spaceSaved,
      errors: this.getErrors()
    };
  }

  private async cleanChrome(): Promise<{ filesDeleted: number; spaceSaved: number }> {
    const chromePaths = this.getChromePaths();
    return await this.cleanBrowserPaths(chromePaths, 'Chrome');
  }

  private async cleanFirefox(): Promise<{ filesDeleted: number; spaceSaved: number }> {
    const firefoxPaths = this.getFirefoxPaths();
    return await this.cleanBrowserPaths(firefoxPaths, 'Firefox');
  }

  private async cleanEdge(): Promise<{ filesDeleted: number; spaceSaved: number }> {
    const edgePaths = this.getEdgePaths();
    return await this.cleanBrowserPaths(edgePaths, 'Edge');
  }

  private async cleanSafari(): Promise<{ filesDeleted: number; spaceSaved: number }> {
    const safariPaths = this.getSafariPaths();
    return await this.cleanBrowserPaths(safariPaths, 'Safari');
  }

  private getChromePaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    
    if (osType === 'windows') {
      const localAppData = process.env.LOCALAPPDATA || '';
      return [
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'GPUCache'),
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'ShaderCache'),
        path.join(localAppData, 'Google', 'Chrome', 'User Data', 'SwiftShader')
      ];
    } else if (osType === 'macos') {
      return [
        path.join(homeDir, 'Library', 'Caches', 'Google', 'Chrome'),
        path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'GPUCache'),
        path.join(homeDir, 'Library', 'Application Support', 'Google', 'Chrome', 'ShaderCache')
      ];
    } else {
      return [
        path.join(homeDir, '.cache', 'google-chrome'),
        path.join(homeDir, '.config', 'google-chrome', 'Default', 'GPUCache'),
        path.join(homeDir, '.config', 'google-chrome', 'ShaderCache')
      ];
    }
  }

  private getFirefoxPaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    
    if (osType === 'windows') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const appData = process.env.APPDATA || '';
      return [
        path.join(localAppData, 'Mozilla', 'Firefox', 'Profiles', '*', 'cache2'),
        path.join(localAppData, 'Mozilla', 'Firefox', 'Profiles', '*', 'startupCache'),
        path.join(appData, 'Mozilla', 'Firefox', 'Profiles', '*', 'cache2'),
        path.join(appData, 'Mozilla', 'Firefox', 'Profiles', '*', 'startupCache')
      ];
    } else if (osType === 'macos') {
      return [
        path.join(homeDir, 'Library', 'Caches', 'Firefox'),
        path.join(homeDir, 'Library', 'Application Support', 'Firefox', 'Profiles', '*', 'cache2'),
        path.join(homeDir, 'Library', 'Application Support', 'Firefox', 'Profiles', '*', 'startupCache')
      ];
    } else {
      return [
        path.join(homeDir, '.cache', 'mozilla', 'firefox'),
        path.join(homeDir, '.mozilla', 'firefox', '*', 'cache2'),
        path.join(homeDir, '.mozilla', 'firefox', '*', 'startupCache')
      ];
    }
  }

  private getEdgePaths(): string[] {
    const osType = OSDetector.getOS();
    const homeDir = OSDetector.getHomeDirectory();
    
    if (osType === 'windows') {
      const localAppData = process.env.LOCALAPPDATA || '';
      return [
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'Code Cache'),
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'Default', 'GPUCache'),
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data', 'ShaderCache')
      ];
    } else if (osType === 'macos') {
      return [
        path.join(homeDir, 'Library', 'Caches', 'Microsoft Edge'),
        path.join(homeDir, 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'GPUCache')
      ];
    } else {
      return [
        path.join(homeDir, '.cache', 'microsoft-edge'),
        path.join(homeDir, '.config', 'microsoft-edge', 'Default', 'GPUCache')
      ];
    }
  }

  private getSafariPaths(): string[] {
    const homeDir = OSDetector.getHomeDirectory();
    
    return [
      path.join(homeDir, 'Library', 'Caches', 'com.apple.Safari'),
      path.join(homeDir, 'Library', 'Safari', 'WebpageIcons.db'),
      path.join(homeDir, 'Library', 'Safari', 'Webpage Previews')
    ];
  }

  private async cleanBrowserPaths(browserPaths: string[], browserName: string): Promise<{ filesDeleted: number; spaceSaved: number }> {
    let filesDeleted = 0;
    let spaceSaved = 0;

    for (const browserPath of browserPaths) {
      try {
        if (browserPath.includes('*')) {
          // Handle wildcard paths
          const files = await this.findFiles([path.join(browserPath, '**', '*')]);
          
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
          // Handle direct paths
          if (await this.pathExists(browserPath)) {
            const cacheFiles = await this.findFiles([
              path.join(browserPath, '**', '*')
            ]);

            for (const file of cacheFiles) {
              if (this.isFileOldEnough(file, this.config.maxFileAge)) {
                const result = await this.deleteFile(file);
                if (result.deleted) {
                  filesDeleted++;
                  spaceSaved += result.size;
                }
              }
            }

            // Clean the directory itself if it's empty
            if (await this.isDirectoryEmpty(browserPath)) {
              const result = await this.deleteDirectory(browserPath);
              if (result.deleted) {
                filesDeleted++;
              }
            }
          }
        }
      } catch (error) {
        this.errors.push(`Error cleaning ${browserName} cache at ${browserPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
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
