export const config = {
  site: {
    title: "wangxiaotao's blog",
    name: "博客",
    description: "wangxiaotao's blog",
    keywords: ["博客", "AI", "个人博客", "技术博客"],
    url: "https://blog.wangxt.online",
    baseUrl: "https://blog.wangxt.online",
    image: "https://blog.wangxt.online/og-image.png",
    logo: {
      type: "img", // icon: 使用 Lucide 图标, svg: 使用 SVG 文件, img: 使用图片文件
      icon: "SquareTerminal", // 当 type 为 "icon" 时使用的 Lucide 图标名称
      svg: "/logo.svg", // 当 type 为 "svg" 时使用的 SVG 文件路径
      img: "/favicon.png", // 当 type 为 "img" 时使用的图片文件路径
      alt: "wangxiaotao's blog", // 图片的 alt 文本
      width: 100, // logo 宽度
      height: 100, // logo 高度
    },
    favicon: {
      ico: "/favicon.ico",
      png: "/favicon.png",
      svg: "/favicon.svg",
      appleTouchIcon: "/favicon.png",
    },
    manifest: "/site.webmanifest",
    rss: {
      title: "wangxiaotao's blog",
      description: "wangxiaotao's blog",
      feedLinks: {
        rss2: "/rss.xml",
        json: "/feed.json",
        atom: "/atom.xml",
      },
    },
  },
  author: {
    name: "wangxiaotao",
    email: "wang1471520488@gmail.com",
    bio: "个人博客",
  },
  social: {
    github: "https://github.com/wxt2rr",
    x: "https://x.com/wangxt0223",
    wechat: "lprr0223",
  },
  giscus: {
    repo: "wxt2rr/my-blog",
    repoId: "R_kgDOPrPGvA",
    categoryId: "DIC_kwDOPrPGvM4CvFS4",
  },
  navigation: {
    main: [
      {
        title: "文章",
        href: "/blog",
      },
    ],
  },
  seo: {
    metadataBase: new URL("https://blog.wangxt.online"),
    alternates: {
      canonical: "./",
    },
    openGraph: {
      type: "website" as const,
      locale: "zh_CN",
    },
    twitter: {
      card: "summary_large_image" as const,
      creator: "@wangxt0223",
    },
  },
};
