import * as fs from 'fs-extra';
import * as path from 'path';
import { OSDetector } from './OSDetector';

export interface CleanupConfig {
  // File size thresholds
  largeFileThreshold: number; // in bytes (default: 1GB)
  
  // Paths configuration
  customTempPaths: string[];
  customCachePaths: string[];
  downloadsPath: string;
  exclusions: string[];
  
  // Browser configuration
  browsers: {
    chrome: boolean;
    firefox: boolean;
    edge: boolean;
    safari: boolean;
  };
  
  // Downloads organization
  organizeDownloads: {
    enabled: boolean;
    categories: {
      [key: string]: string[];
    };
  };
  
  // Safety settings
  confirmDeletions: boolean;
  backupBeforeDelete: boolean;
  maxFileAge: number; // in days, 0 means no age limit
}

export class ConfigManager {
  private defaultConfig: CleanupConfig;
  private configPath: string;

  constructor(customConfigPath?: string) {
    this.configPath = customConfigPath || this.getDefaultConfigPath();
    this.defaultConfig = this.createDefaultConfig();
  }

  private getDefaultConfigPath(): string {
    const homeDir = OSDetector.getHomeDirectory();
    return path.join(homeDir, '.cleanmypc', 'config.json');
  }

  private createDefaultConfig(): CleanupConfig {
    const homeDir = OSDetector.getHomeDirectory();
    const osType = OSDetector.getOS();
    
    let downloadsPath = path.join(homeDir, 'Downloads');
    
    // OS-specific adjustments
    if (osType === 'windows') {
      downloadsPath = path.join(homeDir, 'Downloads');
    } else if (osType === 'macos') {
      downloadsPath = path.join(homeDir, 'Downloads');
    }

    return {
      largeFileThreshold: 1024 * 1024 * 1024, // 1GB
      customTempPaths: [],
      customCachePaths: [],
      downloadsPath,
      exclusions: [],
      browsers: {
        chrome: true,
        firefox: true,
        edge: true,
        safari: osType === 'macos'
      },
      organizeDownloads: {
        enabled: true,
        categories: {
          'Images': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
          'Videos': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
          'Audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
          'Documents': ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.pages'],
          'Spreadsheets': ['.xls', '.xlsx', '.csv', '.ods', '.numbers'],
          'Presentations': ['.ppt', '.pptx', '.odp', '.key'],
          'Archives': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
          'Installers': ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage'],
          'Code': ['.js', '.ts', '.html', '.css', '.py', '.java', '.cpp', '.c', '.php', '.rb']
        }
      },
      confirmDeletions: true,
      backupBeforeDelete: false,
      maxFileAge: 0 // No age limit by default
    };
  }

  async loadConfig(): Promise<CleanupConfig> {
    try {
      if (await fs.pathExists(this.configPath)) {
        const configData = await fs.readJson(this.configPath);
        // Merge with defaults to ensure all properties exist
        return { ...this.defaultConfig, ...configData };
      }
    } catch (error) {
      console.warn(`Warning: Could not load config from ${this.configPath}. Using defaults.`);
    }
    
    return this.defaultConfig;
  }

  async saveConfig(config: CleanupConfig): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJson(this.configPath, config, { spaces: 2 });
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDefaultConfigFile(): Promise<void> {
    if (!(await fs.pathExists(this.configPath))) {
      await this.saveConfig(this.defaultConfig);
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getDefaultConfig(): CleanupConfig {
    return { ...this.defaultConfig };
  }
}
