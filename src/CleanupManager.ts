import chalk from 'chalk';
import ora from 'ora';
import { OSDetector } from './utils/OSDetector';
import { ConfigManager, CleanupConfig } from './utils/ConfigManager';
import { Logger } from './utils/Logger';
import { ReportGenerator } from './utils/ReportGenerator';
import { TempCleaner } from './modules/TempCleaner';
import { CacheCleaner } from './modules/CacheCleaner';
import { BrowserCleaner } from './modules/BrowserCleaner';
import { TrashCleaner } from './modules/TrashCleaner';
import { DownloadsOrganizer } from './modules/DownloadsOrganizer';
import { LargeFileFinder } from './modules/LargeFileFinder';

export interface CleanupResult {
  task: string;
  filesDeleted: number;
  spaceSaved: number;
  filesOrganized?: number;
  largeFiles?: Array<{ path: string; size: number }>;
  errors: string[];
}

export class CleanupManager {
  private results: CleanupResult[] = [];
  private osType: string;
  
  constructor(
    private config: CleanupConfig,
    private logger: Logger,
    private dryRun: boolean = false,
    private debug: boolean = false
  ) {
    this.osType = OSDetector.getOS();
  }

  async runAllTasks(): Promise<void> {
    this.logger.info(chalk.blue('🚀 Starting comprehensive system cleanup...'));
    this.logger.info(chalk.gray(`OS detected: ${this.osType}`));
    
    if (this.dryRun) {
      this.logger.warn(chalk.yellow('⚠️  DRY RUN MODE - No files will actually be deleted'));
    }

    await this.cleanTempFiles();
    await this.cleanCacheFiles();
    await this.cleanBrowserCaches();
    await this.emptyTrash();
    await this.organizeDownloads();
    await this.findLargeFiles();

    this.printSummary();
  }

  async cleanTempFiles(): Promise<CleanupResult> {
    const spinner = ora('Cleaning temporary files...').start();
    
    try {
      const cleaner = new TempCleaner(this.config, this.dryRun, this.debug);
      const result = await cleaner.clean();
      
      this.results.push(result);
      
      if (result.errors.length > 0) {
        spinner.warn(chalk.yellow(`Temp cleanup completed with ${result.errors.length} warnings`));
        result.errors.forEach((error: string) => this.logger.warn(error));
      } else {
        spinner.succeed(chalk.green(`Temp files cleaned: ${result.filesDeleted} files, ${this.formatBytes(result.spaceSaved)} freed`));
      }
      
      return result;
    } catch (error) {
      spinner.fail(chalk.red('Failed to clean temp files'));
      const result: CleanupResult = {
        task: 'temp',
        filesDeleted: 0,
        spaceSaved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      this.results.push(result);
      return result;
    }
  }

  async cleanCacheFiles(): Promise<CleanupResult> {
    const spinner = ora('Cleaning cache files...').start();
    
    try {
      const cleaner = new CacheCleaner(this.config, this.dryRun, this.debug);
      const result = await cleaner.clean();
      
      this.results.push(result);
      
      if (result.errors.length > 0) {
        spinner.warn(chalk.yellow(`Cache cleanup completed with ${result.errors.length} warnings`));
        result.errors.forEach((error: string) => this.logger.warn(error));
      } else {
        spinner.succeed(chalk.green(`Cache files cleaned: ${result.filesDeleted} files, ${this.formatBytes(result.spaceSaved)} freed`));
      }
      
      return result;
    } catch (error) {
      spinner.fail(chalk.red('Failed to clean cache files'));
      const result: CleanupResult = {
        task: 'cache',
        filesDeleted: 0,
        spaceSaved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      this.results.push(result);
      return result;
    }
  }

  async cleanBrowserCaches(): Promise<CleanupResult> {
    const spinner = ora('Cleaning browser caches...').start();
    
    try {
      const cleaner = new BrowserCleaner(this.config, this.dryRun, this.debug);
      const result = await cleaner.clean();
      
      this.results.push(result);
      
      if (result.errors.length > 0) {
        spinner.warn(chalk.yellow(`Browser cleanup completed with ${result.errors.length} warnings`));
        result.errors.forEach((error: string) => this.logger.warn(error));
      } else {
        spinner.succeed(chalk.green(`Browser caches cleaned: ${result.filesDeleted} files, ${this.formatBytes(result.spaceSaved)} freed`));
      }
      
      return result;
    } catch (error) {
      spinner.fail(chalk.red('Failed to clean browser caches'));
      const result: CleanupResult = {
        task: 'browsers',
        filesDeleted: 0,
        spaceSaved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      this.results.push(result);
      return result;
    }
  }

  async emptyTrash(): Promise<CleanupResult> {
    const spinner = ora('Emptying trash/recycle bin...').start();
    
    try {
      const cleaner = new TrashCleaner(this.config, this.dryRun, this.debug);
      const result = await cleaner.clean();
      
      this.results.push(result);
      
      if (result.errors.length > 0) {
        spinner.warn(chalk.yellow(`Trash cleanup completed with ${result.errors.length} warnings`));
        result.errors.forEach((error: string) => this.logger.warn(error));
      } else {
        spinner.succeed(chalk.green(`Trash emptied: ${result.filesDeleted} files, ${this.formatBytes(result.spaceSaved)} freed`));
      }
      
      return result;
    } catch (error) {
      spinner.fail(chalk.red('Failed to empty trash'));
      const result: CleanupResult = {
        task: 'trash',
        filesDeleted: 0,
        spaceSaved: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      this.results.push(result);
      return result;
    }
  }

  async organizeDownloads(): Promise<CleanupResult> {
    const spinner = ora('Organizing downloads folder...').start();
    
    try {
      const organizer = new DownloadsOrganizer(this.config, this.dryRun, this.debug);
      const result = await organizer.organize();
      
      this.results.push(result);
      
      if (result.errors.length > 0) {
        spinner.warn(chalk.yellow(`Downloads organization completed with ${result.errors.length} warnings`));
        result.errors.forEach((error: string) => this.logger.warn(error));
      } else {
        spinner.succeed(chalk.green(`Downloads organized: ${result.filesOrganized || 0} files moved`));
      }
      
      return result;
    } catch (error) {
      spinner.fail(chalk.red('Failed to organize downloads'));
      const result: CleanupResult = {
        task: 'downloads',
        filesDeleted: 0,
        spaceSaved: 0,
        filesOrganized: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      this.results.push(result);
      return result;
    }
  }

  async findLargeFiles(): Promise<CleanupResult> {
    const spinner = ora('Finding large files...').start();
    
    try {
      const finder = new LargeFileFinder(this.config, this.dryRun, this.debug);
      const result = await finder.find();
      
      this.results.push(result);
      
      if (result.errors.length > 0) {
        spinner.warn(chalk.yellow(`Large file search completed with ${result.errors.length} warnings`));
        result.errors.forEach((error: string) => this.logger.warn(error));
      } else {
        const largeFileCount = result.largeFiles?.length || 0;
        spinner.succeed(chalk.green(`Found ${largeFileCount} large files (>${this.formatBytes(this.config.largeFileThreshold)})`));
      }
      
      return result;
    } catch (error) {
      spinner.fail(chalk.red('Failed to find large files'));
      const result: CleanupResult = {
        task: 'largeFiles',
        filesDeleted: 0,
        spaceSaved: 0,
        largeFiles: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
      this.results.push(result);
      return result;
    }
  }

  async generateReport(reportPath: string): Promise<void> {
    const generator = new ReportGenerator();
    await generator.generate(this.results, reportPath);
    this.logger.info(chalk.green(`📊 Report saved to: ${reportPath}`));
  }

  private printSummary(): void {
    console.log('\n' + chalk.blue('📊 CLEANUP SUMMARY') + '\n');
    
    let totalFiles = 0;
    let totalSpace = 0;
    let totalOrganized = 0;
    let totalErrors = 0;

    this.results.forEach(result => {
      totalFiles += result.filesDeleted;
      totalSpace += result.spaceSaved;
      totalOrganized += result.filesOrganized || 0;
      totalErrors += result.errors.length;
    });

    console.log(chalk.green(`✅ Total files cleaned: ${totalFiles}`));
    console.log(chalk.green(`💾 Total space freed: ${this.formatBytes(totalSpace)}`));
    console.log(chalk.green(`📁 Total files organized: ${totalOrganized}`));
    
    if (totalErrors > 0) {
      console.log(chalk.yellow(`⚠️  Total warnings: ${totalErrors}`));
    }

    console.log('\n' + chalk.blue('🎉 Cleanup completed!'));
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getResults(): CleanupResult[] {
    return this.results;
  }
}
