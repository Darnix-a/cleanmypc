import inquirer from 'inquirer';
import chalk from 'chalk';
import { CleanupManager } from './CleanupManager';
import { Logger } from './utils/Logger';

export class InteractiveMode {
  constructor(
    private cleanupManager: CleanupManager,
    private logger: Logger
  ) {}

  async start(): Promise<void> {
    this.logger.info(chalk.blue('🧹 Welcome to CleanMyPC Interactive Mode!\n'));

    const mainChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '🚀 Run complete cleanup (all tasks)', value: 'complete' },
          { name: '🎯 Select specific cleanup tasks', value: 'selective' },
          { name: '⚙️  Configure settings', value: 'configure' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    switch (mainChoice.action) {
      case 'complete':
        await this.runCompleteCleanup();
        break;
      case 'selective':
        await this.runSelectiveCleanup();
        break;
      case 'configure':
        await this.configureSettings();
        break;
      case 'exit':
        this.logger.info(chalk.gray('Goodbye! 👋'));
        return;
    }

    // Ask if user wants to continue
    const continueChoice = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Would you like to perform another action?',
        default: false
      }
    ]);

    if (continueChoice.continue) {
      await this.start();
    }
  }

  private async runCompleteCleanup(): Promise<void> {
    const confirmation = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: chalk.yellow('⚠️  This will run all cleanup tasks. Continue?'),
        default: true
      }
    ]);

    if (confirmation.proceed) {
      await this.cleanupManager.runAllTasks();
      await this.askForReport();
    }
  }

  private async runSelectiveCleanup(): Promise<void> {
    const taskChoices = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'tasks',
        message: 'Select cleanup tasks to run:',
        choices: [
          { name: '🗂️  Clean temporary files', value: 'temp', checked: true },
          { name: '💾 Clean cache files', value: 'cache', checked: true },
          { name: '🌐 Clean browser caches', value: 'browsers', checked: true },
          { name: '🗑️  Empty trash/recycle bin', value: 'trash', checked: false },
          { name: '📁 Organize downloads folder', value: 'downloads', checked: false },
          { name: '📊 Find large files', value: 'largeFiles', checked: false }
        ]
      }
    ]);

    if (taskChoices.tasks.length === 0) {
      this.logger.warn(chalk.yellow('No tasks selected.'));
      return;
    }

    const confirmation = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Run ${taskChoices.tasks.length} selected task(s)?`,
        default: true
      }
    ]);

    if (confirmation.proceed) {
      for (const task of taskChoices.tasks) {
        switch (task) {
          case 'temp':
            await this.cleanupManager.cleanTempFiles();
            break;
          case 'cache':
            await this.cleanupManager.cleanCacheFiles();
            break;
          case 'browsers':
            await this.cleanupManager.cleanBrowserCaches();
            break;
          case 'trash':
            await this.cleanupManager.emptyTrash();
            break;
          case 'downloads':
            await this.cleanupManager.organizeDownloads();
            break;
          case 'largeFiles':
            await this.handleLargeFiles();
            break;
        }
      }
      await this.askForReport();
    }
  }

  private async handleLargeFiles(): Promise<void> {
    const result = await this.cleanupManager.findLargeFiles();
    
    if (result.largeFiles && result.largeFiles.length > 0) {
      this.logger.info(chalk.blue('\n📊 Large Files Found:'));
      
      result.largeFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.path} (${this.formatBytes(file.size)})`);
      });

      const deleteChoice = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'filesToDelete',
          message: 'Select files to delete (optional):',
          choices: result.largeFiles.map((file, index) => ({
            name: `${file.path} (${this.formatBytes(file.size)})`,
            value: index
          }))
        }
      ]);

      if (deleteChoice.filesToDelete.length > 0) {
        const finalConfirmation = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmDelete',
            message: chalk.red(`⚠️  Are you sure you want to delete ${deleteChoice.filesToDelete.length} file(s)?`),
            default: false
          }
        ]);

        if (finalConfirmation.confirmDelete) {
          // TODO: Implement actual file deletion
          this.logger.info(chalk.green(`✅ Would delete ${deleteChoice.filesToDelete.length} file(s)`));
        }
      }
    } else {
      this.logger.info(chalk.green('✅ No large files found.'));
    }
  }

  private async configureSettings(): Promise<void> {
    this.logger.info(chalk.blue('⚙️  Configuration options will be implemented in a future version.'));
    this.logger.info(chalk.gray('For now, you can manually edit the config file at ~/.cleanmypc/config.json'));
  }

  private async askForReport(): Promise<void> {
    const reportChoice = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generateReport',
        message: 'Would you like to generate a cleanup report?',
        default: false
      }
    ]);

    if (reportChoice.generateReport) {
      const reportFormat = await inquirer.prompt([
        {
          type: 'list',
          name: 'format',
          message: 'Select report format:',
          choices: [
            { name: 'Text file (.txt)', value: 'txt' },
            { name: 'JSON file (.json)', value: 'json' }
          ]
        }
      ]);

      const reportPath = `cleanmypc-report-${new Date().toISOString().split('T')[0]}.${reportFormat.format}`;
      await this.cleanupManager.generateReport(reportPath);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
