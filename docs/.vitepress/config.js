import { defineConfig, createContentLoader } from 'vitepress'
import { writeFileSync } from 'fs'
import { Feed } from 'feed'
import path from 'path'

async function generateFeed(config) {
  const feed = new Feed({
    title: 'Mao Ya',
    description: '3D可视化工程师 & 全栈开发者 & PMP项目经理',
    id: 'https://maoya.me/',
    link: 'https://maoya.me/',
    language: 'zh-CN',
    image: 'https://maoya.me/profile.jpg',
    copyright: `Copyright © ${new Date().getFullYear()} Mao Ya`
  })

  const posts = await createContentLoader('**/*.md', { excerpt: true }).load()
  const articles = posts
    .filter(p => p.url !== '/' && !p.url.endsWith('/contact.html') && !p.url.endsWith('/about.html'))
    .sort((a, b) => (b.frontmatter?.date || 0) - (a.frontmatter?.date || 0))

  for (const post of articles) {
    const url = `https://maoya.me${post.url}`
    feed.addItem({
      title: post.frontmatter?.title || post.url,
      id: url,
      link: url,
      description: post.frontmatter?.description || post.excerpt || '',
      date: post.frontmatter?.date ? new Date(post.frontmatter.date) : new Date()
    })
  }

  writeFileSync(path.join(config.outDir, 'feed.xml'), feed.rss2())
}

export default defineConfig({
  title: 'Mao Ya',
  description: '3D可视化工程师 & 全栈开发者 & PMP项目经理',
  lang: 'zh-CN',

  sitemap: {
    hostname: 'https://maoya.me'
  },

  head: [
    ['link', { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'alternate', type: 'application/rss+xml', title: 'Mao Ya RSS', href: 'https://maoya.me/feed.xml' }],
    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Mao Ya' }],
    ['meta', { property: 'og:locale', content: 'zh_CN' }],
    ['meta', { property: 'og:image', content: 'https://maoya.me/profile.jpg' }],
    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: 'https://maoya.me/profile.jpg' }],
    // Umami Analytics
    ['script', {
      defer: '',
      src: 'https://cloud.umami.is/script.js',
      'data-website-id': 'bb825a3b-18fc-4c76-87ac-73b8e36aa3c6'
    }]
  ],

  transformHead({ pageData }) {
    const head = []
    const canonicalUrl = `https://maoya.me/${pageData.relativePath}`
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '.html')

    head.push(['link', { rel: 'canonical', href: canonicalUrl }])
    head.push(['meta', { property: 'og:url', content: canonicalUrl }])

    if (pageData.frontmatter.description) {
      head.push(['meta', { property: 'og:description', content: pageData.frontmatter.description }])
      head.push(['meta', { name: 'twitter:description', content: pageData.frontmatter.description }])
    }

    const title = pageData.frontmatter.title || pageData.title
    if (title) {
      head.push(['meta', { property: 'og:title', content: title }])
      head.push(['meta', { name: 'twitter:title', content: title }])
    }

    // JSON-LD structured data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': pageData.frontmatter.layout === 'home' ? 'WebSite' : 'Article',
      name: title,
      description: pageData.frontmatter.description || '',
      url: canonicalUrl,
      author: {
        '@type': 'Person',
        name: 'Mao Ya',
        url: 'https://maoya.me'
      }
    }
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify(jsonLd)])

    return head
  },

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
  },

  async buildEnd(config) {
    await generateFeed(config)
  }
})
