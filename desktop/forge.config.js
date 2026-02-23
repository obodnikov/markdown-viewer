// desktop/forge.config.js — Electron Forge packaging configuration
const path = require('path');

module.exports = {
  packagerConfig: {
    name: 'Markdown Viewer',
    executableName: 'markdown-viewer',
    appBundleId: 'com.markdownviewer.desktop',
    appCategoryType: 'public.app-category.developer-tools',
    icon: path.join(__dirname, 'icons', 'icon'),  // .icns/.ico added per platform

    // Do NOT use asar — Flask manager needs filesystem access to spawn the backend
    asar: false,

    // Include backend, frontend, and assets as extra resources
    // In packaged app these land in: resources/app-resources/
    extraResource: [
      path.join(__dirname, '..', 'backend'),
      path.join(__dirname, '..', 'public'),
      path.join(__dirname, '..', 'scripts'),
      path.join(__dirname, '..', 'styles'),
      path.join(__dirname, '..', 'icons'),
      path.join(__dirname, '..', 'LLM_PROMPTS.md'),
    ],

    // Ignore dev/build artifacts from the app bundle
    ignore: [
      /^\/\.git/,
      /^\/\.vscode/,
      /^\/\.env/,
      /^\/docs\//,
      /^\/desktop\/out\//,
      /^\/desktop\/build\/dist\//,
      /^\/desktop\/build\/work\//,
      /^\/desktop\/build\/\.buildvenv\//,
      /^\/backend\/tests\//,
      /^\/backend\/logs\//,
      /^\/backend\/__pycache__\//,
      /^\/node_modules\//,
      /docker-compose\.yml$/,
      /Dockerfile$/,
      /nginx\.conf$/,
      /supervisord\.conf$/,
    ],

    // File type associations — OS registers the app as handler for these extensions
    fileAssociations: [
      {
        ext: 'md',
        name: 'Markdown Document',
        description: 'Markdown Document',
        mimeType: 'text/markdown',
        role: 'Editor',
        icon: path.join(__dirname, 'icons', 'icon')
      },
      {
        ext: 'markdown',
        name: 'Markdown Document',
        description: 'Markdown Document',
        mimeType: 'text/markdown',
        role: 'Editor',
        icon: path.join(__dirname, 'icons', 'icon')
      }
    ],

    // macOS code signing — uncomment and set env vars for distribution
    // osxSign: {},
    // osxNotarize: {
    //   tool: 'notarytool',
    //   appleId: process.env.APPLE_ID,
    //   appleIdPassword: process.env.APPLE_PASSWORD,
    //   teamId: process.env.APPLE_TEAM_ID
    // },
  },

  rebuildConfig: {},

  makers: [
    // macOS DMG
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'ULFO',
        icon: path.join(__dirname, 'icons', 'icon.icns'),
      }
    },

    // macOS / Linux ZIP (fallback)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux']
    },

    // Windows Squirrel installer
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'MarkdownViewer',
        authors: 'Markdown Viewer Team',
        description: 'Markdown Viewer & Editor Desktop Application',
        setupIcon: path.join(__dirname, 'icons', 'icon.ico')
      }
    },

    // Linux DEB
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Markdown Viewer Team',
          homepage: 'https://github.com/your-repo/markdown-viewer',
          icon: path.join(__dirname, 'icons', 'icon.png'),
          categories: ['Development', 'TextEditor'],
          description: 'Markdown Viewer & Editor with LLM transformations'
        }
      }
    },

    // Linux RPM
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          homepage: 'https://github.com/your-repo/markdown-viewer',
          icon: path.join(__dirname, 'icons', 'icon.png'),
          categories: ['Development', 'TextEditor']
        }
      }
    }
  ]
};
