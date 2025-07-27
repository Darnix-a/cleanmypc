#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { CleanupManager } from './CleanupManager';
import { ConfigManager } from './utils/ConfigManager';
import { Logger } from './utils/Logger';
import { InteractiveMode } from './InteractiveMode';

const program = new Command();

async function main() {
  program
    .name('cleanmypc')
    .description('Professional cross-platform CLI tool for system cleanup')
    .version('1.0.0')
    .option('-d, --dry-run', 'Show what would be cleaned without actually doing it')
    .option('-s, --silent', 'Run without prompts (use for automation)')
    .option('-r, --report <path>', 'Save cleanup report to file (txt or json)')
    .option('-c, --config <path>', 'Use custom config file')
    .option('--debug', 'Enable debug logging')
    .option('--temp', 'Clean temporary files only')
    .option('--cache', 'Clean cache files only')
    .option('--browsers', 'Clean browser caches only')
    .option('--trash', 'Empty trash/recycle bin only')
    .option('--downloads', 'Organize downloads folder only')
    .option('--large-files', 'Find and optionally delete large files only');

  program.parse();
  
  const options = program.opts();
  
  try {
    // Initialize configuration
    const configManager = new ConfigManager(options.config);
    const config = await configManager.loadConfig();
    
    // Initialize logger
    const logger = new Logger(options.silent);
    
    // Initialize cleanup manager
    const cleanupManager = new CleanupManager(config, logger, options.dryRun, options.debug);
    
    // Check if specific cleanup tasks were requested
    const specificTasks = ['temp', 'cache', 'browsers', 'trash', 'downloads', 'largeFiles']
      .filter(task => options[task]);
    
    if (specificTasks.length > 0) {
      // Run specific tasks non-interactively
      await runSpecificTasks(cleanupManager, specificTasks, options);
    } else if (options.silent) {
      // Run all tasks silently
      await cleanupManager.runAllTasks();
    } else {
      // Run interactive mode
      const interactive = new InteractiveMode(cleanupManager, logger);
      await interactive.start();
    }
    
    // Generate report if requested
    if (options.report) {
      await cleanupManager.generateReport(options.report);
    }
    
  } catch (error) {
    console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

async function runSpecificTasks(cleanupManager: CleanupManager, tasks: string[], options: any) {
  for (const task of tasks) {
    switch (task) {
      case 'temp':
        await cleanupManager.cleanTempFiles();
        break;
      case 'cache':
        await cleanupManager.cleanCacheFiles();
        break;
      case 'browsers':
        await cleanupManager.cleanBrowserCaches();
        break;
      case 'trash':
        await cleanupManager.emptyTrash();
        break;
      case 'downloads':
        await cleanupManager.organizeDownloads();
        break;
      case 'largeFiles':
        await cleanupManager.findLargeFiles();
        break;
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
