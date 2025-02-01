// Originally based on the type definitions for electron-packager 14.0
// Project: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/electron-packager
// Original Authors:
// * Maxime LUCE <https://github.com/SomaticIT>
// * Juan Jimenez-Anca <https://github.com/cortopy>
// * John Kleinschmidt <https://github.com/jkleinsc>
// * Brendan Forster <https://github.com/shiftkey>
// * Mark Lee <https://github.com/malept>
// * Florian Keller <https://github.com/ffflorian>

import { CreateOptions as AsarOptions } from '@electron/asar';
import { ElectronDownloadRequestOptions as ElectronDownloadOptions } from '@electron/get';
import { NotaryToolCredentials } from '@electron/notarize/lib/types';
import { SignOptions as OSXInternalSignOptions } from '@electron/osx-sign/dist/esm/types';
import { SignOptions as WindowsInternalSignOptions } from '@electron/windows-sign/dist/esm/types';
import type { makeUniversalApp } from '@electron/universal';

/**
 * @internal
 */
export type MakeUniversalOpts = Parameters<typeof makeUniversalApp>[0]

/**
 * Architectures that have been supported by the official Electron prebuilt binaries, past
 * and present.
 */
export type OfficialArch = 'ia32' | 'x64' | 'armv7l' | 'arm64' | 'mips64el' | 'universal';

/**
 * Platforms that have been supported by the official Electron prebuilt binaries, past and present.
 */
export type OfficialPlatform = 'linux' | 'win32' | 'darwin' | 'mas';

export type TargetArch = OfficialArch | string;
export type TargetPlatform = OfficialPlatform | string;
export type ArchOption = TargetArch | 'all';
export type PlatformOption = TargetPlatform | 'all';

/**
 * Architecture values that we actually support out of the box (not considering unofficial values provided in
 * `download.mirrorOptions`).
 */
export type SupportedArch = OfficialArch | 'all';

/**
 * Platform values that we actually support out of the box (not considering unofficial values provided in
 * `download.mirrorOptions`).
 */
export type SupportedPlatform = OfficialPlatform | 'all';

/**
 * A predicate function that, given an absolute file `path`, returns `true` if the file should be
 * ignored, or `false` if the file should be kept. *This does not use any of the default ignored
 * files/directories listed for the {@link Options.ignore | ignore} option.*
 */

export type IgnoreFunction = (path: string) => boolean;

export type HookFunctionErrorCallback = (err?: Error | null) => void

/**
 * A function that is called on the completion of a packaging stage.
 *
 * By default, the functions are called in parallel (via
 * [`Promise.all`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)).
 * If you need the functions called serially, there is a utility function provided. Please note that
 * **callback-style functions are not supported by `serialHooks`.**
 *
 * @param buildPath - For {@link Options.afterExtract | afterExtract}, the path to the temporary folder where the prebuilt
 * Electron binary has been extracted to. For {@link Options.afterCopy | afterCopy} and {@link Options.afterPrune | afterPrune}, the path to the
 * folder where the Electron app has been copied to. For {@link Options.afterComplete | afterComplete}, the final directory
 * of the packaged application.
 * @param electronVersion - the version of Electron that is being bundled with the application.
 * @param platform - The target platform you are packaging for.
 * @param arch - The target architecture you are packaging for.
 * @param callback - Must be called once you have completed your actions.
 *
 * @example
 *
 * ```javascript
 * const packager = require('@electron/packager')
   * const { serialHooks } = require('@electron/packager/src/hooks')
 *
 * packager({
 *   // ...
 *   afterCopy: [serialHooks([
 *     (buildPath, electronVersion, platform, arch) => {
 *       return new Promise((resolve, reject) => {
 *         setTimeout(() => {
 *           console.log('first function')
 *           resolve()
 *         }, 1000)
 *       })
 *     },
 *     (buildPath, electronVersion, platform, arch) => {
 *       console.log('second function')
 *     }
 *   ])],
 *   // ...
 * })
 * ```
 *
 * For real-world examples of `HookFunction`s, see the [list of related
 * plugins](https://github.com/electron/packager#plugins).
 */
export type HookFunction =
  (
    buildPath: string,
    electronVersion: string,
    platform: TargetPlatform,
    arch: TargetArch,
    callback: HookFunctionErrorCallback,
  ) => void;

export type TargetDefinition = {
  arch: TargetArch;
  platform: TargetPlatform;
}
export type FinalizePackageTargetsHookFunction = (targets: TargetDefinition[], callback: HookFunctionErrorCallback) => void;

/** See the documentation for [`@electron/osx-sign`](https://npm.im/@electron/osx-sign#opts) for details.
 * @interface
 */
export type OsxSignOptions = Omit<OSXInternalSignOptions, 'app' | 'binaries' | 'platform' | 'version'>;

/**
 * See the documentation for [`@electron/universal`](https://github.com/electron/universal)
 * for details.
 * @interface
 */
export type OsxUniversalOptions = Omit<MakeUniversalOpts, 'x64AppPath' | 'arm64AppPath' | 'outAppPath' | 'force'>

/**
 * @internal
 */
export type IgnoreFunc = (platform: string, arch: string) => boolean;

/**
 * Defines URL protocol schemes to be used on macOS.
 */
export interface MacOSProtocol {
  /**
   * The descriptive name. Maps to the `CFBundleURLName` metadata property.
   */
  name: string;
  /**
   * One or more protocol schemes associated with the app. For example, specifying `myapp`
   * would cause URLs such as `myapp://path` to be opened with the app. Maps to the
   * `CFBundleURLSchemes` metadata property.
   */
  schemes: string[];
}

/**
 * See the documentation for [`@electron/windows-sign`](https://github.com/electron/windows-sign)
 * for details.
 */
export interface WindowsSignOptions extends Omit<WindowsInternalSignOptions, 'appDirectory'> {
  continueOnError?: boolean
}

/**
 * A collection of application metadata to embed into the Windows executable.
 */
export interface Win32MetadataOptions {
  /** Defaults to the `author` name from the nearest `package.json`. */
  CompanyName?: string;
  /** Defaults to either `productName` or `name` from the nearest `package.json`. */
  FileDescription?: string;
  /** Defaults to the renamed Electron `.exe` file. */
  OriginalFilename?: string;
  /** Defaults to either `productName` or `name` from the nearest `package.json`. */
  ProductName?: string;
  /** Defaults to either `productName` or `name` from the nearest `package.json`. */
  InternalName?: string;
  /** See [MSDN](https://msdn.microsoft.com/en-us/library/6ad1fshk.aspx#Anchor_9) for details. */
  'requested-execution-level'?: 'asInvoker' | 'highestAvailable' | 'requireAdministrator';
  /**
   * Path to a local manifest file.
   *
   * See [MSDN](https://msdn.microsoft.com/en-us/library/windows/desktop/aa374191.aspx) for more details.
   */
  'application-manifest'?: string;
}

/** Options passed to the `packager()` function. */
export interface Options {
  /** The source directory. */
  dir: string;
  /**
   * Functions to be called after your app directory has been packaged into an .asar file.
   *
   * **Note**: `afterAsar` will only be called if the {@link asar} option is set.
   */
  afterAsar?: HookFunction[];
  /** Functions to be called after the packaged application has been moved to the final directory. */
  afterComplete?: HookFunction[];
  /**
   * Functions to be called after your app directory has been copied to a temporary directory.
   *
   * **Note**: `afterCopy` will not be called if the {@link prebuiltAsar} option is set.
   */
  afterCopy?: HookFunction[];
  /**
   * Functions to be called after the files specified in the {@link extraResource} option have been copied.
   **/
  afterCopyExtraResources?: HookFunction[];
  /** Functions to be called after the prebuilt Electron binary has been extracted to a temporary directory. */
  afterExtract?: HookFunction[];
  /**
   * Functions to be called after the final matrix of platform/arch combination is determined.  Use this to
   * learn what archs/platforms packager is targetting when you pass "all" as a value.
   */
  afterFinalizePackageTargets?: FinalizePackageTargetsHookFunction[];

  // @TODO(erikian): document this
  afterInitialize?: HookFunction[];

  /**
   * Functions to be called after Node module pruning has been applied to the application.
   *
   * **Note**: None of these functions will be called if the {@link prune} option is `false` or
   * the {@link prebuiltAsar} option is set.
   */
  afterPrune?: HookFunction[];

  /** When `true`, sets both {@link arch} and {@link platform} to `all`. */
  all?: boolean;
  /*
   * The bundle identifier to use in the application's `Info.plist`.
   *
   * @category macOS
   */
  appBundleId?: string;
  /**
   * The application category type, as shown in the Finder via *View → Arrange by Application
   * Category* when viewing the Applications directory.
   *
   * For example, `app-category-type=public.app-category.developer-tools` will set the
   * application category to *Developer Tools*.
   *
   * Valid values are listed in [Apple's documentation](https://developer.apple.com/library/ios/documentation/General/Reference/InfoPlistKeyReference/Articles/LaunchServicesKeys.html#//apple_ref/doc/uid/TP40009250-SW8).
   *
   * @category macOS
   */
  appCategoryType?: string;
  /**
   * The human-readable copyright line for the app. Maps to the `LegalCopyright` metadata
   * property on Windows, and `NSHumanReadableCopyright` on macOS.
   */
  appCopyright?: string;
  /**
   * The release version of the application.
   *
   * By default the `version` property in the `package.json` is used, but it can be overridden
   * with this argument. If neither are provided, the version of Electron will be used. Maps
   * to the `ProductVersion` metadata property on Windows, and `CFBundleShortVersionString`
   * on macOS.
   */
  appVersion?: string;
  /**
   * The target system architecture(s) to build for.
   *
   * Not required if the {@link all} option is set. If `arch` is set to `all`, all supported
   * architectures for the target platforms specified by {@link platform} will be built.
   * Arbitrary combinations of individual architectures are also supported via a comma-delimited
   * string or array of strings. The non-`all` values correspond to the architecture names used
   * by [Electron releases](https://github.com/electron/electron/releases). This value
   * is not restricted to the official set if {@link download|`download.mirrorOptions`} is set.
   *
   * Defaults to the arch of the host computer running Electron Packager.
   *
   * Arch values for the official prebuilt Electron binaries:
   * - `ia32`
   * - `x64`
   * - `armv7l`
   * - `arm64` _(Linux: Electron 1.8.0 and above; Windows: 6.0.8 and above; macOS: 11.0.0-beta.1 and above)_
   * - `mips64el` _(Electron 1.8.2-beta.5 to 1.8.8)_
   */
  arch?: ArchOption | ArchOption[];
  /**
   * Whether to package the application's source code into an archive, using [Electron's
   * archive format](https://github.com/electron/asar). Reasons why you may want to enable
   * this feature include mitigating issues around long path names on Windows, slightly speeding
   * up `require`, and concealing your source code from cursory inspection. When the value
   * is `true`, it passes the default configuration to the `asar` module. The configuration
   * values can be customized when the value is an `Object`. Supported sub-options include, but
   * are not limited to:
   * - `ordering` (*string*): A path to an ordering file for packing files. An explanation can be
   *   found on the [Atom issue tracker](https://github.com/atom/atom/issues/10163).
   * - `unpack` (*string*): A [glob expression](https://github.com/isaacs/minimatch#features),
   *   when specified, unpacks the file with matching names to the `app.asar.unpacked` directory.
   * - `unpackDir` (*string*): Unpacks the dir to the `app.asar.unpacked` directory whose names
   *   exactly or pattern match this string. The `asar.unpackDir` is relative to {@link dir}.
   *
   * Defaults to `false`.
   *
   * Some examples:
   *
   * - `asar.unpackDir = 'sub_dir'` will unpack the directory `/<dir>/sub_dir`
   * - `asar.unpackDir = path.join('**', '{sub_dir1/sub_sub_dir,sub_dir2}', '*')` will unpack the directories `/<dir>/sub_dir1/sub_sub_dir` and `/<dir>/sub_dir2`, but it will not include their subdirectories.
   * - `asar.unpackDir = path.join('**', '{sub_dir1/sub_sub_dir,sub_dir2}', '**')` will unpack the subdirectories of the directories `/<dir>/sub_dir1/sub_sub_dir` and `/<dir>/sub_dir2`.
   * - `asar.unpackDir = path.join('**', '{sub_dir1/sub_sub_dir,sub_dir2}', '**', '*')` will unpack the directories `/<dir>/sub_dir1/sub_sub_dir` and `/<dir>/sub_dir2` and their subdirectories.
   *
   * **Note:** `asar` will have no effect if the {@link prebuiltAsar} option is set.
   */
  asar?: boolean | AsarOptions;
  /**
   * Functions to be called before your app directory is packaged into an .asar file.
   *
   * **Note**: `beforeAsar` will only be called if the {@link asar} option is set.
   */
  beforeAsar?: HookFunction[];
  /**
   * Functions to be called before your app directory is copied to a temporary directory.
   *
   * **Note**: `beforeCopy` will not be called if the {@link prebuiltAsar} option is set.
   */
  beforeCopy?: HookFunction[];
  /**
   * Functions to be called before the files specified in the {@link extraResource} option are copied.
   **/
  beforeCopyExtraResources?: HookFunction[];
  /**
   * The build version of the application. Defaults to the value of the {@link appVersion} option.
   * Maps to the `FileVersion` metadata property on Windows, and `CFBundleVersion` on macOS.
   */
  buildVersion?: string;
  /**
   * Forces support for Mojave (macOS 10.14) dark mode in your packaged app. This sets the
   * `NSRequiresAquaSystemAppearance` key to `false` in your app's `Info.plist`.  For more information,
   * see the [Electron documentation](https://www.electronjs.org/docs/tutorial/mojave-dark-mode-guide)
   * and the [Apple developer documentation](https://developer.apple.com/documentation/appkit/nsappearancecustomization/choosing_a_specific_appearance_for_your_app).
   *
   * @category macOS
   */
  darwinDarkModeSupport?: boolean;
  /**
   * Whether symlinks should be dereferenced during the copying of the application source.
   * Defaults to `true`.
   *
   * **Note:** `derefSymlinks` will have no effect if the {@link prebuiltAsar} option is set.
   */
  derefSymlinks?: boolean;
  /**
   * If present, passes custom options to [`@electron/get`](https://npm.im/@electron/get). See
   * the module for option descriptions, proxy support, and defaults. Supported parameters
   * include, but are not limited to:
   * - `cacheRoot` (*string*): The directory where prebuilt, pre-packaged Electron downloads are cached.
   * - `mirrorOptions` (*Object*): Options to override the default Electron download location.
   *
   * **Note:** `download` sub-options will have no effect if the {@link electronZipDir} option is set.
   */
  download?: ElectronDownloadOptions;
  /**
   * The Electron version with which the app is built (without the leading 'v') - for example,
   * [`1.4.13`](https://github.com/electron/electron/releases/tag/v1.4.13). See [Electron
   * releases](https://github.com/electron/electron/releases) for valid versions. If omitted, it
     * will use the version of the nearest local installation of `electron` or `electron-nightly`
     *  defined in `package.json` in either `devDependencies` or `dependencies`.
   */
  electronVersion?: string;
  /**
   * The local path to a directory containing Electron ZIP files for Electron Packager to unzip, instead
   * of downloading them. The ZIP filenames should be in the same format as the ones downloaded from the
   * [Electron releases](https://github.com/electron/electron/releases) site.
   *
   * **Note:** Setting this option prevents the {@link download} sub-options from being used, as
   * the functionality gets skipped over.
   */
  electronZipDir?: string;
  /**
   * The name of the executable file, sans file extension. Defaults to the value for the {@link name}
   * option. For `darwin` or `mas` target platforms, this does not affect the name of the
   * `.app` folder - this will use the {@link name} option instead.
   */
  executableName?: string;
  /**
   * When the value is a string, specifies the filename of a `plist` file. Its contents are merged
   * into the app's `Info.plist`.
   * When the value is an `Object`, it specifies an already-parsed `plist` data structure that is
   * merged into the app's `Info.plist`.
   *
   * Entries from `extendInfo` override entries in the base `Info.plist` file supplied by
     * `electron` or `electron-nightly`, but are overridden by other
   * options such as {@link appVersion} or {@link appBundleId}.
   *
   * @category macOS
   */
  extendInfo?: string | { [property: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  /**
   * When the value is a string, specifies the filename of a `plist` file. Its contents are merged
   * into all the Helper apps' `Info.plist` files.
   * When the value is an `Object`, it specifies an already-parsed `plist` data structure that is
   * merged into all the Helper apps' `Info.plist` files.
   *
   * Entries from `extendHelperInfo` override entries in the helper apps' `Info.plist` file supplied by
     * `electron` or `electron-nightly`, but are overridden by other
   * options such as {@link appVersion} or {@link appBundleId}.
   *
   * @category macOS
   */
  extendHelperInfo?: string | { [property: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  /**
   * One or more files to be copied directly into the app's `Contents/Resources` directory for
   * macOS target platforms, and the `resources` directory for other target platforms. The
   * resources directory can be referenced in the packaged app via the
   * [`process.resourcesPath`](https://www.electronjs.org/docs/api/process#processresourcespath-readonly) value.
   */
  extraResource?: string | string[];
  /**
   * The bundle identifier to use in the application helper's `Info.plist`.
   *
   * @category macOS
   */
  helperBundleId?: string;
  /**
   * The local path to the icon file, if the target platform supports setting embedding an icon.
   *
   * Currently you must look for conversion tools in order to supply an icon in the format required by the platform:
   *
   * - macOS: `.icns`
   * - Windows: `.ico` ([See the readme](https://github.com/electron/packager#building-windows-apps-from-non-windows-platforms) for details on non-Windows platforms)
   * - Linux: this option is not supported, as the dock/window list icon is set via
   *   [the `icon` option in the `BrowserWindow` constructor](https://electronjs.org/docs/api/browser-window/#new-browserwindowoptions).
   *   *Please note that you need to use a PNG, and not the macOS or Windows icon formats, in order for it
   *   to show up in the dock/window list.* Setting the icon in the file manager is not currently supported.
   *
   * If the file extension is omitted, it is auto-completed to the correct extension based on the
   * platform, including when {@link platform |`platform: 'all'`} is in effect.
   */
  icon?: string;
  /**
   * One or more additional [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
   * patterns which specify which files to ignore when copying files to create the app bundle(s). The
   * regular expressions are matched against the absolute path of a given file/directory to be copied.
   *
   * **Please note that [glob patterns](https://en.wikipedia.org/wiki/Glob_%28programming%29) will not work.**
   *
   * The following paths are always ignored (*when you aren't using an {@link IgnoreFunction}*):
   *
   * - the directory specified by the {@link out} option
   * - the temporary directory used to build the Electron app
   * - `node_modules/.bin`
   * - `node_modules/electron`
     * - `node_modules/electron-nightly`
   * - `.git`
   * - files and folders ending in `.o` and `.obj`
   *
   * **Note**: Node modules specified in `devDependencies` are ignored by default, via the
   * {@link prune} option.
   *
   * **Note:** `ignore` will have no effect if the {@link prebuiltAsar} option is set.
   */
  ignore?: RegExp | Array<string | RegExp> | IgnoreFunction;
  /**
   * Ignores [system junk files](https://github.com/sindresorhus/junk) when copying the Electron app,
   * regardless of the {@link ignore} option.
   *
   * **Note:** `junk` will have no effect if the {@link prebuiltAsar} option is set.
   */
  junk?: boolean;
  /**
   * The application name. If omitted, it will use the `productName` or `name` value from the
   * nearest `package.json`.
   *
   * **Regardless of source, characters in the Electron app name which are not allowed in all target
   * platforms' filenames (e.g., `/`), will be replaced by hyphens (`-`).**
   */
  name?: string;
  /**
   * If present, notarizes macOS target apps when the host platform is macOS and Xcode is installed.
   * See [`@electron/notarize`](https://github.com/electron/notarize#method-notarizeopts-promisevoid)
   * for option descriptions, such as how to use `appleIdPassword` safely or obtain an API key.
   *
   * **Requires the {@link osxSign} option to be set.**
   *
   * @category macOS
   */
  osxNotarize?: NotaryToolCredentials;
  /**
   * If present, signs macOS target apps when the host platform is macOS and Xcode is installed.
   * When the value is `true`, pass default configuration to the signing module. See
   * [@electron/osx-sign](https://npm.im/@electron/osx-sign#opts---options) for sub-option descriptions and
   * their defaults. Options include, but are not limited to:
   * - `identity` (*string*): The identity used when signing the package via `codesign`.
   * - `binaries` (*array<string>*): Path to additional binaries that will be signed along with built-ins of Electron/
   *
   * @category macOS
   */
  osxSign?: true | OsxSignOptions;
  /**
   * Used to provide custom options to the internal call to `@electron/universal` when building a macOS
   * app with the target architecture of "universal".  Unused otherwise, providing a value does not imply
   * a universal app is built.
   */
  osxUniversal?: OsxUniversalOptions;
  /**
   * The base directory where the finished package(s) are created.
   *
   * Defaults to the current working directory.
   */
  out?: string;
  /**
   * Whether to replace an already existing output directory for a given platform (`true`) or
   * skip recreating it (`false`). Defaults to `false`.
   */
  overwrite?: boolean;
  /**
   * The target platform(s) to build for.
   *
   * Not required if the {@link all} option is set. If `platform` is set to `all`, all officially
   * supported target platforms for the target architectures specified by the {@link arch} option
   * will be built. Arbitrary combinations of individual platforms are also supported via a
   * comma-delimited string or array of strings.
   *
   * The official non-`all` values correspond to the platform names used by [Electron
   * releases](https://github.com/electron/electron/releases). This value is not restricted to
   * the official set if {@link download|`download.mirrorOptions`} is set.
   *
   * Defaults to the platform of the host computer running Electron Packager.
   *
   * Platform values for the official prebuilt Electron binaries:
   * - `darwin` (macOS)
   * - `linux`
   * - `mas` (macOS, specifically for submitting to the Mac App Store)
   * - `win32`
   */
  platform?: TargetPlatform | 'all' | Array<TargetPlatform | 'all'>;
  /**
   * The path to a prebuilt ASAR file.
   *
   * **Note:** Setting this option prevents the following options from being used, as the functionality
   * gets skipped over:
   *
   * - {@link asar}
   * - {@link afterCopy}
   * - {@link afterPrune}
   * - {@link derefSymlinks}
   * - {@link ignore}
   * - {@link junk}
   * - {@link prune}
   */
  prebuiltAsar?: string;
  /**
   * The URL protocol schemes associated with the Electron app.
   *
   * @category macOS
   */
  protocols?: MacOSProtocol[];
  /**
   * Walks the `node_modules` dependency tree to remove all of the packages specified in the
   * `devDependencies` section of `package.json` from the outputted Electron app.
   *
   * Defaults to `true`.
   *
   * **Note:** `prune` will have no effect if the {@link prebuiltAsar} option is set.
   */
  prune?: boolean;
  /**
   * If `true`, disables printing informational and warning messages to the console when
   * packaging the application. This does not disable errors.
   *
   * Defaults to `false`.
   */
  quiet?: boolean;
  /**
   * The base directory to use as a temporary directory. Set to `false` to disable use of a
   * temporary directory. Defaults to the system's temporary directory.
   */
  tmpdir?: string | false;
  /**
   * Human-readable descriptions of how the Electron app uses certain macOS features. These are displayed
   * in the App Store. A non-exhaustive list of available properties:
   *
   * * `Camera` - required for media access API usage in macOS Catalina
   * * `Microphone` - required for media access API usage in macOS Catalina
   *
   * Valid properties are the [Cocoa keys for MacOS](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CocoaKeys.html)
   * of the pattern `NS(.*)UsageDescription`, where the captured group is the key to use.
   *
   * @example
   *
   * ```javascript
   * {
   *   usageDescription: {
   *     Camera: 'Needed for video calls',
   *     Microphone: 'Needed for voice calls'
   *   }
   * }
   * ```
   *
   * @category macOS
   */
  usageDescription?: { [property: string]: string };
  /**
   * Application metadata to embed into the Windows executable.
   * @category Windows
   */
  win32metadata?: Win32MetadataOptions;
  /**
   * If present, signs Windows binary files.
   * When the value is `true`, pass default configuration to the signing module. See
   * [@electron/windows-sign](https://npm.im/@electron/windows-sign) for sub-option descriptions and
   * their defaults.
   * @category Windows
   */
  windowsSign?: true | WindowsSignOptions;
}

/**
 * @internal
 */
interface OptionsWithRequiredArchAndPlatform extends Options {
  arch: Exclude<Options['arch'], undefined>;
  platform: Exclude<Options['platform'], undefined>;
}

/**
 * @internal
 */
export interface DownloadOptions extends OptionsWithRequiredArchAndPlatform {
  artifactName: string;
  version: string;
}

/**
 * @internal
 */
export interface ComboOptions extends Options {
  arch: OptionsWithRequiredArchAndPlatform['arch']
  platform: OptionsWithRequiredArchAndPlatform['platform']
}

/**
 * Path to an application bundle, or an empty string in case the bundling was skipped for some reason.
 */
export type ApplicationBundlePath = string
