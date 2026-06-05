import path from 'path';
import {
  app,
  dialog,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
} from 'electron';
import { ensureTranslationHistoryFile } from './services/translationHistoryService';
import {
  compressTilde,
  getTranslationHistoryConfigPath,
  toWorkspaceRelativePath,
} from '../shared/pathUtils';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  getWorkspaceRoot: () => string;

  constructor(mainWindow: BrowserWindow, getWorkspaceRoot: () => string) {
    this.mainWindow = mainWindow;
    this.getWorkspaceRoot = getWorkspaceRoot;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template =
      process.platform === 'darwin'
        ? this.buildDarwinTemplate()
        : this.buildDefaultTemplate();

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  openTranslationHistory(): void {
    ensureTranslationHistoryFile();
    if (this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send(
      'menu:openTranslationHistory',
      getTranslationHistoryConfigPath(),
    );
  }

  async openExternalDocument(): Promise<void> {
    if (this.mainWindow.isDestroyed()) return;

    const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
      title: '打开外部文档',
      properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0) {
      return;
    }

    const filePath = path.resolve(filePaths[0]);
    const parentDir = path.dirname(filePath);
    const workspaceRoot = this.getWorkspaceRoot();
    let openPath: string;
    let switchWorkspace = false;

    const relativePath = toWorkspaceRelativePath(workspaceRoot, filePath);
    if (relativePath) {
      openPath = relativePath;
    } else {
      const { response } = await dialog.showMessageBox(this.mainWindow, {
        type: 'question',
        buttons: ['切换', '不切换'],
        defaultId: 0,
        cancelId: 1,
        title: '切换工作目录',
        message: '是否将工作目录切换到外部文档所在文件夹？',
        detail: parentDir,
      });
      switchWorkspace = response === 0;
      openPath = switchWorkspace ? path.basename(filePath) : compressTilde(filePath);
    }

    if (this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send('menu:openExternalDocument', {
      openPath,
      parentDir,
      switchWorkspace,
    });
  }

  async openExternalDirectory(): Promise<void> {
    if (this.mainWindow.isDestroyed()) return;

    const { canceled, filePaths } = await dialog.showOpenDialog(this.mainWindow, {
      title: '打开外部目录',
      properties: ['openDirectory'],
    });
    if (canceled || filePaths.length === 0) {
      return;
    }

    const absolutePath = path.resolve(filePaths[0]);
    const workspaceRoot = this.getWorkspaceRoot();
    const relative = toWorkspaceRelativePath(workspaceRoot, absolutePath);
    let relativePath: string | null = null;

    if (relative !== null) {
      relativePath =
        relative === '' ? '' : relative.endsWith('/') ? relative : `${relative}/`;
    }

    if (this.mainWindow.isDestroyed()) return;
    this.mainWindow.webContents.send('menu:openExternalDirectory', {
      relativePath,
      absolutePath,
    });
  }

  buildFileSubmenu(): MenuItemConstructorOptions[] {
    const quitAccelerator =
      process.platform === 'darwin' ? 'Command+Q' : 'Ctrl+Q';

    return [
      {
        label: '打开',
        submenu: [
          {
            label: '打开外部文档',
            click: () => {
              void this.openExternalDocument();
            },
          },
          {
            label: '目录',
            click: () => {
              void this.openExternalDirectory();
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: '翻译历史',
        click: () => {
          this.openTranslationHistory();
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        accelerator: quitAccelerator,
        click: () => {
          app.quit();
        },
      },
    ];
  }

  buildDarwinTemplate(): MenuItemConstructorOptions[] {
    const subMenuAbout: DarwinMenuItemConstructorOptions = {
      label: 'MulEd',
      submenu: [
        {
          label: 'About MulEd',
          selector: 'orderFrontStandardAboutPanel:',
        },
        { type: 'separator' },
        { label: 'Services', submenu: [] },
        { type: 'separator' },
        {
          label: 'Hide MulEd',
          accelerator: 'Command+H',
          selector: 'hide:',
        },
        {
          label: 'Hide Others',
          accelerator: 'Command+Shift+H',
          selector: 'hideOtherApplications:',
        },
        { label: 'Show All', selector: 'unhideAllApplications:' },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    };
    const subMenuFile: MenuItemConstructorOptions = {
      label: '文件',
      submenu: this.buildFileSubmenu(),
    };
    const subMenuEdit: DarwinMenuItemConstructorOptions = {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
        { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'Command+A',
          selector: 'selectAll:',
        },
      ],
    };
    const subMenuViewDev: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'Command+R',
          click: () => {
            this.mainWindow.webContents.reload();
          },
        },
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'Alt+Command+I',
          click: () => {
            this.mainWindow.webContents.toggleDevTools();
          },
        },
      ],
    };
    const subMenuViewProd: MenuItemConstructorOptions = {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Ctrl+Command+F',
          click: () => {
            this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
          },
        },
      ],
    };
    const subMenuWindow: DarwinMenuItemConstructorOptions = {
      label: 'Window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'Command+M',
          selector: 'performMiniaturize:',
        },
        { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
        { type: 'separator' },
        { label: 'Bring All to Front', selector: 'arrangeInFront:' },
      ],
    };
    const subMenuHelp: MenuItemConstructorOptions = {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click() {
            shell.openExternal('https://electronjs.org');
          },
        },
        {
          label: 'Documentation',
          click() {
            shell.openExternal(
              'https://github.com/electron/electron/tree/main/docs#readme',
            );
          },
        },
        {
          label: 'Community Discussions',
          click() {
            shell.openExternal('https://www.electronjs.org/community');
          },
        },
        {
          label: 'Search Issues',
          click() {
            shell.openExternal('https://github.com/electron/electron/issues');
          },
        },
      ],
    };

    const subMenuView =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
        ? subMenuViewDev
        : subMenuViewProd;

    return [subMenuAbout, subMenuFile, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '文件(&F)',
        submenu: this.buildFileSubmenu(),
      },
      {
        label: '&View',
        submenu:
          process.env.NODE_ENV === 'development' ||
          process.env.DEBUG_PROD === 'true'
            ? [
                {
                  label: '&Reload',
                  accelerator: 'Ctrl+R',
                  click: () => {
                    this.mainWindow.webContents.reload();
                  },
                },
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
                {
                  label: 'Toggle &Developer Tools',
                  accelerator: 'Alt+Ctrl+I',
                  click: () => {
                    this.mainWindow.webContents.toggleDevTools();
                  },
                },
              ]
            : [
                {
                  label: 'Toggle &Full Screen',
                  accelerator: 'F11',
                  click: () => {
                    this.mainWindow.setFullScreen(
                      !this.mainWindow.isFullScreen(),
                    );
                  },
                },
              ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Learn More',
            click() {
              shell.openExternal('https://electronjs.org');
            },
          },
          {
            label: 'Documentation',
            click() {
              shell.openExternal(
                'https://github.com/electron/electron/tree/main/docs#readme',
              );
            },
          },
          {
            label: 'Community Discussions',
            click() {
              shell.openExternal('https://www.electronjs.org/community');
            },
          },
          {
            label: 'Search Issues',
            click() {
              shell.openExternal('https://github.com/electron/electron/issues');
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
