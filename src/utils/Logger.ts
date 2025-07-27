import chalk from 'chalk';

export class Logger {
  constructor(private silent: boolean = false) {}

  info(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  success(message: string): void {
    if (!this.silent) {
      console.log(chalk.green(message));
    }
  }

  warn(message: string): void {
    if (!this.silent) {
      console.warn(chalk.yellow(message));
    }
  }

  error(message: string): void {
    // Always show errors, even in silent mode
    console.error(chalk.red(message));
  }

  debug(message: string): void {
    if (!this.silent && process.env.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  log(message: string): void {
    this.info(message);
  }
}
