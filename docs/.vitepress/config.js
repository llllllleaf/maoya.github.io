import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Mao Ya',
  description: '3D可视化工程师 & 全栈开发者 & PMP项目经理',
  lang: 'zh-CN',
  // base: '/maoya.github.io/', // 使用自定义域名时不需要

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],

  themeConfig: {
    nav: [
      { text: 'Research', link: '/' },
      { text: 'Contact', link: '/contact' }
    ],

    sidebar: false,

    socialLinks: [],

    footer: {
      message: '',
      copyright: `Copyright © ${new Date().getFullYear()} Mao Ya`
    },

    search: {
      provider: 'local'
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    docFooter: {
      prev: false,
      next: false
    }
  }
})
