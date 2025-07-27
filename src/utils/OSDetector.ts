import * as os from 'os';

export class OSDetector {
  static getOS(): 'windows' | 'macos' | 'linux' {
    const platform = os.platform();
    
    switch (platform) {
      case 'win32':
        return 'windows';
      case 'darwin':
        return 'macos';
      case 'linux':
        return 'linux';
      default:
        return 'linux'; // Default to linux for other Unix-like systems
    }
  }

  static isWindows(): boolean {
    return this.getOS() === 'windows';
  }

  static isMacOS(): boolean {
    return this.getOS() === 'macos';
  }

  static isLinux(): boolean {
    return this.getOS() === 'linux';
  }

  static getHomeDirectory(): string {
    return os.homedir();
  }

  static getTempDirectory(): string {
    return os.tmpdir();
  }
}
