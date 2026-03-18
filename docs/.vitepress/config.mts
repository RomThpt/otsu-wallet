import { defineConfig } from 'vitepress';
import llmstxt from 'vitepress-plugin-llms';
import { copyOrDownloadAsMarkdownButtons } from 'vitepress-plugin-llms';

export default defineConfig({
  title: ' ',
  description:
    'A secure, open-source browser extension wallet for XRPL and XRPL EVM Sidechain',

  lang: 'en-US',
  base: '/otsu-wallet/',

  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/png',
        href: '/otsu-wallet/favicon.png',
      },
    ],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    [
      'link',
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: '',
      },
    ],
    [
      'link',
      {
        href: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
        rel: 'stylesheet',
      },
    ],
  ],

  themeConfig: {
    logo: '/commons_light_logo.png',

    nav: [
      {
        text: 'Documentation',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Links',
        items: [
          {
            text: 'GitHub',
            link: 'https://github.com/RomThpt/otsu-wallet',
          },
          {
            text: 'XRPL Commons',
            link: 'https://www.xrpl-commons.org',
          },
          { text: 'XRPL Docs', link: 'https://xrpl.org/' },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Start Here',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ],
      },
      {
        text: 'Usage',
        items: [
          { text: 'Managing Accounts', link: '/guide/accounts' },
          { text: 'Tokens & NFTs', link: '/guide/tokens' },
          { text: 'Transactions', link: '/guide/transactions' },
        ],
      },
      {
        text: 'Developers',
        items: [
          { text: 'dApp Integration', link: '/guide/dapp-integration' },
          { text: 'API Reference', link: '/guide/api-reference' },
          { text: 'Contributing', link: '/guide/contributing' },
        ],
      },
    ],

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/RomThpt/otsu-wallet',
      },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright &copy; 2025 XRPL Commons',
    },

    search: {
      provider: 'local',
    },
  },

  markdown: {
    lineNumbers: true,
    config(md) {
      md.use(copyOrDownloadAsMarkdownButtons);
    },
  },

  vite: {
    plugins: [
      llmstxt({
        generateLLMsFullTxt: true,
        ignoreFiles: [],
      }),
    ],
  },

  srcExclude: ['**/README.md', 'assets/**'],
});
