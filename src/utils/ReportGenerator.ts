import * as fs from 'fs-extra';
import * as path from 'path';
import { CleanupResult } from '../CleanupManager';

export class ReportGenerator {
  async generate(results: CleanupResult[], reportPath: string): Promise<void> {
    const isJsonReport = path.extname(reportPath).toLowerCase() === '.json';
    
    if (isJsonReport) {
      await this.generateJsonReport(results, reportPath);
    } else {
      await this.generateTextReport(results, reportPath);
    }
  }

  private async generateJsonReport(results: CleanupResult[], reportPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      results
    };

    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeJson(reportPath, report, { spaces: 2 });
  }

  private async generateTextReport(results: CleanupResult[], reportPath: string): Promise<void> {
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('CleanMyPC - Cleanup Report');
    lines.push('='.repeat(60));
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    const summary = this.generateSummary(results);
    lines.push('SUMMARY:');
    lines.push('-'.repeat(30));
    lines.push(`Total files cleaned: ${summary.totalFiles}`);
    lines.push(`Total space freed: ${this.formatBytes(summary.totalSpace)}`);
    lines.push(`Total files organized: ${summary.totalOrganized}`);
    lines.push(`Total errors: ${summary.totalErrors}`);
    lines.push('');

    lines.push('DETAILED RESULTS:');
    lines.push('-'.repeat(30));

    results.forEach(result => {
      lines.push(`\n${result.task.toUpperCase()}:`);
      lines.push(`  Files deleted: ${result.filesDeleted}`);
      lines.push(`  Space saved: ${this.formatBytes(result.spaceSaved)}`);
      
      if (result.filesOrganized !== undefined) {
        lines.push(`  Files organized: ${result.filesOrganized}`);
      }
      
      if (result.largeFiles && result.largeFiles.length > 0) {
        lines.push(`  Large files found: ${result.largeFiles.length}`);
        result.largeFiles.forEach(file => {
          lines.push(`    - ${file.path} (${this.formatBytes(file.size)})`);
        });
      }
      
      if (result.errors.length > 0) {
        lines.push(`  Errors (${result.errors.length}):`);
        result.errors.forEach(error => {
          lines.push(`    - ${error}`);
        });
      }
    });

    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeFile(reportPath, lines.join('\n'));
  }

  private generateSummary(results: CleanupResult[]) {
    return results.reduce(
      (summary, result) => ({
        totalFiles: summary.totalFiles + result.filesDeleted,
        totalSpace: summary.totalSpace + result.spaceSaved,
        totalOrganized: summary.totalOrganized + (result.filesOrganized || 0),
        totalErrors: summary.totalErrors + result.errors.length
      }),
      { totalFiles: 0, totalSpace: 0, totalOrganized: 0, totalErrors: 0 }
    );
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
