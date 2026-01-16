/**
 * Site-wide configuration
 */

export const siteConfig = {
  name: 'myBlueprint',
  description: 'The all-in-one creator operating system for YouTubers and content studios',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ogImage: '/opengraph-image.png',
  
  // Links
  links: {
    twitter: 'https://twitter.com/yourstudio',
    github: 'https://github.com/yourstudio',
    docs: '/docs',
    support: '/support',
  },
  
  // Creator
  creator: 'myBlueprint',
  
  // SEO
  keywords: [
    'youtube',
    'content creator',
    'video production',
    'script writing',
    'thumbnail',
    'youtube studio',
    'creator tools',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
