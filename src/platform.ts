import fs from 'fs-extra';
import path from 'path';
import asar, { FileRecord } from '@electron/asar';

import {
  baseTempDir,
  createAsarOpts,
  debug,
  ensureArray,
  generateFinalPath,
  validateElectronApp,
  warning,
} from './common';
import { userPathFilter } from './copy-filter';
import { promisifyHooks } from './hooks';
import crypto from 'crypto';
import { ComboOptions } from './types';

export class App {
  asarIntegrity: Record<string, Pick<FileRecord['integrity'], 'algorithm' | 'hash'>> | undefined = undefined;
  asarOptions: ReturnType<typeof createAsarOpts>;
  cachedStagingPath: string | undefined = undefined;
  opts: ComboOptions;
  templatePath: string;

  constructor(opts: ComboOptions, templatePath: string) {
    this.opts = opts;
    this.templatePath = templatePath;
    this.asarOptions = createAsarOpts(opts);

    if (this.opts.prune === undefined) {
      this.opts.prune = true;
    }
  }

  async create(): Promise<string> {
    /* istanbul ignore next */
    throw new Error('Child classes must implement this');
  }

  /**
   * Resource directory path before renaming.
   */
  get originalResourcesDir(): string {
    return this.resourcesDir;
  }

  /**
   * Resource directory path after renaming.
   */
  get resourcesDir(): string {
    return path.join(this.stagingPath, 'resources');
  }

  get originalResourcesAppDir(): string {
    return path.join(this.originalResourcesDir, 'app');
  }

  get electronBinaryDir(): string {
    return this.stagingPath;
  }

  get originalElectronName(): string {
    /* istanbul ignore next */
    throw new Error('Child classes must implement this');
  }

  get newElectronName(): string {
    /* istanbul ignore next */
    throw new Error('Child classes must implement this');
  }

  get executableName() {
    return this.opts.executableName || this.opts.name;
  }

  get stagingPath() {
    if (this.opts.tmpdir === false) {
      return generateFinalPath(this.opts);
    } else {
      if (!this.cachedStagingPath) {
        const tempDir = baseTempDir(this.opts);
        fs.mkdirpSync(tempDir);
        this.cachedStagingPath = fs.mkdtempSync(path.resolve(tempDir, 'tmp-'));
      }
      return this.cachedStagingPath;
    }
  }

  get appAsarPath() {
    return path.join(this.originalResourcesDir, 'app.asar');
  }

  get commonHookArgs() {
    return [
      this.opts.electronVersion,
      this.opts.platform,
      this.opts.arch,
    ];
  }

  get hookArgsWithOriginalResourcesAppDir() {
    return [
      this.originalResourcesAppDir,
      ...this.commonHookArgs,
    ];
  }

  async relativeRename(basePath: string, oldName: string, newName: string) {
    debug(`Renaming ${oldName} to ${newName} in ${basePath}`);
    await fs.rename(path.join(basePath, oldName), path.join(basePath, newName));
  }

  async renameElectron() {
    return this.relativeRename(this.electronBinaryDir, this.originalElectronName, this.newElectronName);
  }

  /**
   * Performs the following initial operations for an app:
   * * Creates temporary directory
   * * Remove default_app (which is either a folder or an asar file)
   * * If a prebuilt asar is specified:
   *   * Copies asar into temporary directory as app.asar
   * * Otherwise:
   *   * Copies template into temporary directory
   *   * Copies user's app into temporary directory
   *   * Prunes non-production node_modules (if opts.prune is either truthy or undefined)
   *   * Creates an asar (if opts.asar is set)
   *
   * Prune and asar are performed before platform-specific logic, primarily so that
   * this.originalResourcesAppDir is predictable (e.g. before .app is renamed for Mac)
   */
  async initialize() {
    debug(`Initializing app in ${this.stagingPath} from ${this.templatePath} template`);

    await fs.move(this.templatePath, this.stagingPath, { overwrite: true });
    await this.removeDefaultApp();
    if (this.opts.prebuiltAsar) {
      await this.copyPrebuiltAsar();
      this.asarIntegrity = {
        [this.appRelativePlatformPath(this.appAsarPath)]: this.getAsarIntegrity(this.appAsarPath),
      };
    } else {
      await this.buildApp();
    }

    await promisifyHooks(this.opts.afterInitialize, this.hookArgsWithOriginalResourcesAppDir);
  }

  async buildApp() {
    await this.copyTemplate();
    await validateElectronApp(this.opts.dir, this.originalResourcesAppDir);
    await this.asarApp();
  }

  async copyTemplate() {
    await promisifyHooks(this.opts.beforeCopy, this.hookArgsWithOriginalResourcesAppDir);

    await fs.copy(this.opts.dir, this.originalResourcesAppDir, {
      filter: userPathFilter(this.opts),
      dereference: this.opts.derefSymlinks ?? true,
    });
    await promisifyHooks(this.opts.afterCopy, this.hookArgsWithOriginalResourcesAppDir);
    if (this.opts.prune) {
      await promisifyHooks(this.opts.afterPrune, this.hookArgsWithOriginalResourcesAppDir);
    }
  }

  async removeDefaultApp() {
    await Promise.all([
      'default_app',
      'default_app.asar',
    ].map(async basename => fs.remove(path.join(this.originalResourcesDir, basename))));
  }

  /**
   * Forces an icon filename to a given extension and returns the normalized filename,
   * if it exists.  Otherwise, returns null.
   *
   * This error path is used by win32 if no icon is specified.
   */
  async normalizeIconExtension(targetExt: string) {
    if (!this.opts.icon) {
      throw new Error('No filename specified to normalizeIconExtension');
    }

    let iconFilename = this.opts.icon;
    const ext = path.extname(iconFilename);
    if (ext !== targetExt) {
      iconFilename = path.join(path.dirname(iconFilename), path.basename(iconFilename, ext) + targetExt);
    }

    if (await fs.pathExists(iconFilename)) {
      return iconFilename;
    } else {
      /* istanbul ignore next */
      warning(`Could not find icon "${iconFilename}", not updating app icon`, this.opts.quiet);
    }
  }

  prebuiltAsarWarning(option: keyof ComboOptions, triggerWarning: unknown) {
    if (triggerWarning) {
      warning(`prebuiltAsar and ${option} are incompatible, ignoring the ${option} option`, this.opts.quiet);
    }
  }

  async copyPrebuiltAsar() {
    if (this.asarOptions) {
      warning('prebuiltAsar has been specified, all asar options will be ignored', this.opts.quiet);
    }

    for (const hookName of ['beforeCopy', 'afterCopy', 'afterPrune'] as const) {
      if (this.opts[hookName]) {
        throw new Error(`${hookName} is incompatible with prebuiltAsar`);
      }
    }

    this.prebuiltAsarWarning('ignore', (this.opts as ComboOptions & {
      originalIgnore: ComboOptions['ignore']
    }).originalIgnore);
    this.prebuiltAsarWarning('prune', !this.opts.prune);
    this.prebuiltAsarWarning('derefSymlinks', this.opts.derefSymlinks !== undefined);

    const src = path.resolve(this.opts.prebuiltAsar!);

    const stat = await fs.stat(src);
    if (!stat.isFile()) {
      throw new Error(`${src} specified in prebuiltAsar must be an asar file.`);
    }

    debug(`Copying asar: ${src} to ${this.appAsarPath}`);
    await fs.copy(src, this.appAsarPath, { overwrite: false, errorOnExist: true });
  }

  appRelativePlatformPath(p: string) {
    if (this.opts.platform === 'win32') {
      return path.win32.relative(this.stagingPath, p);
    }

    return path.posix.relative(this.stagingPath, p);
  }

  async asarApp() {
    if (!this.asarOptions) {
      return Promise.resolve();
    }

    debug(`Running asar with the options ${JSON.stringify(this.asarOptions)}`);

    await promisifyHooks(this.opts.beforeAsar, this.hookArgsWithOriginalResourcesAppDir);

    await asar.createPackageWithOptions(this.originalResourcesAppDir, this.appAsarPath, this.asarOptions);
    this.asarIntegrity = {
      [this.appRelativePlatformPath(this.appAsarPath)]: this.getAsarIntegrity(this.appAsarPath),
    };
    await fs.remove(this.originalResourcesAppDir);

    await promisifyHooks(this.opts.afterAsar, this.hookArgsWithOriginalResourcesAppDir);
  }

  getAsarIntegrity(path: string): Pick<FileRecord['integrity'], 'algorithm' | 'hash'> {
    const { headerString } = asar.getRawHeader(path);
    return {
      algorithm: 'SHA256',
      hash: crypto.createHash('SHA256').update(headerString).digest('hex'),
    };
  }

  async copyExtraResources() {
    if (!this.opts.extraResource) {
      return Promise.resolve();
    }

    const extraResources = ensureArray(this.opts.extraResource);

    const hookArgs = [
      this.stagingPath,
      ...this.commonHookArgs,
    ];

    await promisifyHooks(this.opts.beforeCopyExtraResources, hookArgs);

    await Promise.all(extraResources.map(
      resource => fs.copy(resource, path.resolve(this.stagingPath, this.resourcesDir, path.basename(resource))),
    ));

    await promisifyHooks(this.opts.afterCopyExtraResources, hookArgs);
  }

  async move() {
    const finalPath = generateFinalPath(this.opts);

    if (this.opts.tmpdir !== false) {
      debug(`Moving ${this.stagingPath} to ${finalPath}`);
      await fs.move(this.stagingPath, finalPath);
    }

    if (this.opts.afterComplete) {
      const hookArgs = [
        finalPath,
        ...this.commonHookArgs,
      ];

      await promisifyHooks(this.opts.afterComplete, hookArgs);
    }

    return finalPath;
  }
}
