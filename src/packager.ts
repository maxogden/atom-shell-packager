import { baseTempDir, debug, generateFinalPath, hostInfo, info, isPlatformMac } from './common';
import { populateIgnoredPaths } from './copy-filter';
import { createDownloadCombos, downloadElectronZip } from './download';
import fs from 'fs-extra';
import { getMetadataFromPackageJSON } from './infer';
import { promisifyHooks } from './hooks';
import path from 'path';
import { createPlatformArchPairs, osModules, validateListFromOptions } from './targets';
import { extractElectronZip } from './unzip';
import { packageUniversalMac } from './universal';
import { ApplicationBundlePath, ComboOptions, DownloadOptions, OfficialPlatform, Options, SupportedArch, SupportedPlatform } from './types';
import { App } from './platform';

function debugHostInfo() {
  debug(hostInfo());
}

export class Packager {
  canCreateSymlinks: boolean | undefined = undefined;
  opts: Options;
  tempBase: string;
  useTempDir: boolean;

  constructor(opts: Options) {
    this.opts = opts;
    this.tempBase = baseTempDir(opts);
    this.useTempDir = opts.tmpdir !== false;
  }

  async ensureTempDir() {
    if (this.useTempDir) {
      await fs.remove(this.tempBase);
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Returns `true` if symlink creation is supported, `false` otherwise.
   */
  async testSymlink(comboOpts: ComboOptions): Promise<boolean> {
    await fs.mkdirp(this.tempBase);
    const testPath = await fs.mkdtemp(path.join(this.tempBase, `symlink-test-${comboOpts.platform}-${comboOpts.arch}-`));
    const testFile = path.join(testPath, 'test');
    const testLink = path.join(testPath, 'testlink');

    try {
      await fs.outputFile(testFile, '');
      await fs.symlink(testFile, testLink);
      this.canCreateSymlinks = true;
    } catch (e) {
      /* istanbul ignore next */
      this.canCreateSymlinks = false;
    } finally {
      await fs.remove(testPath);
    }

    return this.canCreateSymlinks;
  }

  /* istanbul ignore next */
  skipHostPlatformSansSymlinkSupport(comboOpts: ComboOptions): ApplicationBundlePath {
    info(`Cannot create symlinks (on Windows hosts, it requires admin privileges); skipping ${comboOpts.platform} platform`, this.opts.quiet);
    return '';
  }

  async extractElectronZip(comboOpts: ComboOptions, zipPath: string, buildDir: string) {
    debug(`Extracting ${zipPath} to ${buildDir}`);
    await extractElectronZip(zipPath, buildDir);
    await promisifyHooks(this.opts.afterExtract, [
      buildDir,
      comboOpts.electronVersion,
      comboOpts.platform,
      comboOpts.arch,
    ]);
  }

  async buildDir(platform: ComboOptions['platform'], arch: ComboOptions['arch']) {
    let buildParentDir;
    if (this.useTempDir) {
      buildParentDir = this.tempBase;
    } else {
      buildParentDir = this.opts.out || process.cwd();
    }
    await fs.mkdirp(buildParentDir);
    return await fs.mkdtemp(path.resolve(buildParentDir, `${platform}-${arch}-template-`));
  }

  async createApp(comboOpts: ComboOptions, zipPath: string) {
    const buildDir = await this.buildDir(comboOpts.platform, comboOpts.arch);
    info(`Packaging app for platform ${comboOpts.platform} ${comboOpts.arch} using electron v${comboOpts.electronVersion}`, this.opts.quiet);

    debug(`Creating ${buildDir}`);
    await fs.ensureDir(buildDir);
    await this.extractElectronZip(comboOpts, zipPath, buildDir);
    const os = await import(osModules[comboOpts.platform as OfficialPlatform]);
    const app = new os.App(comboOpts, buildDir) as App;
    return app.create();
  }

  async checkOverwrite(comboOpts: ComboOptions, zipPath: string): Promise<ApplicationBundlePath> {
    const finalPath = generateFinalPath(comboOpts);
    if (await fs.pathExists(finalPath)) {
      if (this.opts.overwrite) {
        debug(`Removing ${finalPath} due to setting overwrite: true`);
        await fs.remove(finalPath);
        return this.createApp(comboOpts, zipPath);
      } else {
        info(`Skipping ${comboOpts.platform} ${comboOpts.arch} (output dir already exists, use --overwrite to force)`, this.opts.quiet);
        return '';
      }
    } else {
      return this.createApp(comboOpts, zipPath);
    }
  }

  async getElectronZipPath(downloadOpts: DownloadOptions) {
    if (this.opts.electronZipDir) {
      if (await fs.pathExists(this.opts.electronZipDir)) {
        const zipPath = path.resolve(
          this.opts.electronZipDir,
          `electron-v${downloadOpts.version}-${downloadOpts.platform}-${downloadOpts.arch}.zip`,
        );
        if (!await fs.pathExists(zipPath)) {
          throw new Error(`The specified Electron ZIP file does not exist: ${zipPath}`);
        }

        return zipPath;
      }

      throw new Error(`The specified Electron ZIP directory does not exist: ${this.opts.electronZipDir}`);
    } else {
      return downloadElectronZip(downloadOpts);
    }
  }

  async packageForPlatformAndArchWithOpts(comboOpts: ComboOptions, downloadOpts: DownloadOptions): Promise<ApplicationBundlePath> {
    const zipPath = await this.getElectronZipPath(downloadOpts);

    if (!this.useTempDir) {
      return this.createApp(comboOpts, zipPath);
    }

    let skipHostPlatform = false;

    if (isPlatformMac(comboOpts.platform)) {
      /* istanbul ignore else */
      if (this.canCreateSymlinks === undefined && !(await this.testSymlink(comboOpts))) {
        skipHostPlatform = true;
      } else if (!this.canCreateSymlinks) {
        skipHostPlatform = true;
      }
    }

    if (skipHostPlatform) {
      return this.skipHostPlatformSansSymlinkSupport(comboOpts);
    }

    return this.checkOverwrite(comboOpts, zipPath);
  }

  async packageForPlatformAndArch(downloadOpts: DownloadOptions): Promise<ApplicationBundlePath> {
    // Create delegated options object with specific platform and arch, for output directory naming
    const comboOpts: ComboOptions = {
      ...this.opts,
      arch: downloadOpts.arch,
      platform: downloadOpts.platform,
      electronVersion: downloadOpts.version,
    };

    if (isPlatformMac(comboOpts.platform) && comboOpts.arch === 'universal') {
      return packageUniversalMac(this.packageForPlatformAndArchWithOpts.bind(this), await this.buildDir(comboOpts.platform, comboOpts.arch), comboOpts, downloadOpts, this.tempBase);
    }

    return this.packageForPlatformAndArchWithOpts(comboOpts, downloadOpts);
  }
}

async function packageAllSpecifiedCombos(opts: Options, archs: SupportedArch[], platforms: SupportedPlatform[]): Promise<ApplicationBundlePath[]> {
  const packager = new Packager(opts);
  await packager.ensureTempDir();
  return Promise.all(createDownloadCombos(opts, platforms, archs).map(
    downloadOpts => packager.packageForPlatformAndArch(downloadOpts),
  ));
}

/**
 * Bundles Electron-based application source code with a renamed/customized Electron executable and
 * its supporting files into folders ready for distribution.
 *
 * Briefly, this function:
 * - finds or downloads the correct release of Electron
 * - uses that version of Electron to create a app in `<out>/<appname>-<platform>-<arch>`
 *
 * @example
 *
 * ```javascript
 * const packager = require('@electron/packager')
 *
 * async function bundleElectronApp(options) {
 *   const appPaths = await packager(options)
 *   console.log(`Electron app bundles created:\n${appPaths.join("\n")}`)
 * }
 * ```
 *
 * @param opts - Options to configure packaging.
 *
 * @returns A Promise containing the paths to the newly created application bundles.
 */
export async function packager(opts: Options): Promise<string[]> {
  debugHostInfo();

  if (debug.enabled) {
    debug(`Packager Options: ${JSON.stringify(opts)}`);
  }

  const archs = validateListFromOptions(opts, 'arch') as SupportedArch[] | Error;
  const platforms = validateListFromOptions(opts, 'platform') as SupportedPlatform[] | Error;

  if (!Array.isArray(archs)) {
    return Promise.reject(archs);
  }

  if (!Array.isArray(platforms)) {
    return Promise.reject(platforms);
  }

  debug(`Target Platforms: ${platforms.join(', ')}`);
  debug(`Target Architectures: ${archs.join(', ')}`);

  const packageJSONDir = path.resolve(process.cwd(), opts.dir) || process.cwd();

  await getMetadataFromPackageJSON(platforms, opts, packageJSONDir);
  if (opts.name?.endsWith(' Helper')) {
    throw new Error('Application names cannot end in " Helper" due to limitations on macOS');
  }

  debug(`Application name: ${opts.name}`);
  debug(`Target Electron version: ${opts.electronVersion}`);

  populateIgnoredPaths(opts);

  await promisifyHooks(opts.afterFinalizePackageTargets, [
    createPlatformArchPairs(opts, platforms, archs).map(([platform, arch]) => ({ platform, arch })),
  ]);
  const appPaths = await packageAllSpecifiedCombos(opts, archs, platforms);
  // Remove falsy entries (e.g. skipped platforms)
  return appPaths.filter(Boolean);
}
