import { z } from 'zod';

// Zod schema for landing page configuration
export const landingPageConfigSchema = z.object({
  // Basic product info
  slug: z.string().min(1).max(100).describe('URL slug for the product'),
  name: z.string().min(1).max(200).describe('Product name'),
  tagline: z.string().min(1).max(500).describe('Short tagline/headline'),
  description: z.string().min(1).max(2000).describe('Longer product description'),

  // Hero section
  hero: z.object({
    headline: z.string().max(200).optional().default(''),
    subheadline: z.string().max(500).optional().default(''),
    ctaText: z.string().max(50).optional().default('Get Started'),
    ctaUrl: z.string().url().optional().default('https://example.com/signup'),
  }),

  // Features section
  features: z.array(
    z.object({
      title: z.string().max(100),
      description: z.string().max(300),
      icon: z.string().optional().default('✨'),
    })
  ).min(1).max(20),

  // Pricing section
  pricing: z.object({
    enabled: z.boolean().optional().default(true),
    currency: z.string().max(3).optional().default('USD'),
    plans: z.array(
      z.object({
        name: z.string().max(100),
        price: z.number().positive(),
        period: z.string().max(20).optional().default('/month'),
        description: z.string().max(200).optional().default(''),
        features: z.array(z.string().max(200)),
        highlighted: z.boolean().optional().default(false),
        ctaText: z.string().max(50).optional().default('Get Started'),
      })
    ).min(1).max(5),
    polarEnabled: z.boolean().optional().default(false),
    polarProductId: z.string().optional(),
  }),

  // FAQ section
  faq: z.array(
    z.object({
      question: z.string().max(200),
      answer: z.string().max(1000),
    })
  ).min(0).max(20),

  // Footer
  footer: z.object({
    tagline: z.string().max(200).optional().default(''),
    links: z.array(
      z.object({
        label: z.string().max(100),
        url: z.string().url(),
      })
    ).max(20).optional().default([]),
    socialLinks: z.array(
      z.object({
        platform: z.enum(['twitter', 'github', 'linkedin', 'facebook', 'instagram']),
        url: z.string().url(),
      })
    ).max(10).optional().default([]),
    copyright: z.string().max(500).optional().default('© {year} {company}. All rights reserved.'),
  }),

  // SEO
  seo: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    image: z.string().url().optional(),
  }),
});

// Type derived from schema
export type LandingPageConfig = z.infer<typeof landingPageConfigSchema>;

// Helper function to validate config
export function validateLandingConfig(data: unknown): LandingPageConfig {
  return landingPageConfigSchema.parse(data);
}

// Helper to load config from file
export async function loadLandingConfig(slug: string): Promise<LandingPageConfig> {
  const fs = await import('fs');
  const path = await import('path');

  const basePath = process.cwd();
  const configDir = path.join(basePath, 'landing-configs');

  // Try JSON first
  const jsonPath = path.join(configDir, `${slug}.json`);
  const yamlPath = path.join(configDir, `${slug}.yaml`);
  const ymlPath = path.join(configDir, `${slug}.yml`);

  let configData: unknown;

  if (fs.existsSync(jsonPath)) {
    const content = fs.readFileSync(jsonPath, 'utf-8');
    configData = JSON.parse(content);
  } else if (fs.existsSync(yamlPath)) {
    const yaml = await import('js-yaml');
    const content = fs.readFileSync(yamlPath, 'utf-8');
    configData = yaml.load(content);
  } else if (fs.existsSync(ymlPath)) {
    const yaml = await import('js-yaml');
    const content = fs.readFileSync(ymlPath, 'utf-8');
    configData = yaml.load(content);
  } else {
    throw new Error(`No config file found for slug: ${slug}`);
  }

  return validateLandingConfig(configData);
}
