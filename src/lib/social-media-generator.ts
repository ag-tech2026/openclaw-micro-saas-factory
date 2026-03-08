import { env } from './config';

export interface SocialPost {
  platform: 'twitter' | 'linkedin';
  content: string;
  imagePath?: string;
  imageUrl?: string;
  hashtags: string[];
  scheduledAt?: Date;
}

export interface GeneratedAssets {
  slug: string;
  imagePaths: string[];
  posts: SocialPost[];
  generatedAt: Date;
  status: 'draft' | 'scheduled' | 'posted';
}

class SocialMediaGenerator {
  private baseOutputDir: string;

  constructor() {
    this.baseOutputDir = process.cwd() + '/public/generated';
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const fs = require('fs');
    const path = require('path');

    const dirs = [
      this.baseOutputDir,
      path.join(this.baseOutputDir, 'images'),
      path.join(this.baseOutputDir, 'metadata'),
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Generate social media content for an MVP
   */
  async generateForMvp(config: any, existingAssets?: GeneratedAssets): Promise<GeneratedAssets> {
    const slug = config.slug;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join(this.baseOutputDir, 'images', slug);
    const metadataDir = path.join(this.baseOutputDir, 'metadata');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate product mockup images using OpenRouter vision model
    const imagePaths = await this.generateImages(config, outputDir, timestamp);

    // Generate captions for each platform
    const posts: SocialPost[] = [];

    // Twitter post (concise, with hashtags)
    const twitterCaption = this.generateTwitterCaption(config);
    posts.push({
      platform: 'twitter',
      content: twitterCaption,
      imagePaths: [imagePaths[0]],
      imageUrl: `/generated/images/${slug}/${path.basename(imagePaths[0])}`,
      hashtags: this.extractHashtags(config),
      status: 'draft',
    });

    // LinkedIn post (more professional, longer)
    const linkedinCaption = await this.generateLinkedInCaption(config);
    posts.push({
      platform: 'linkedin',
      content: linkedinCaption,
      imagePaths: imagePaths.length > 1 ? [imagePaths[1]] : [imagePaths[0]],
      imageUrl: imagePaths.length > 1 ? `/generated/images/${slug}/${path.basename(imagePaths[1])}` : `/generated/images/${slug}/${path.basename(imagePaths[0])}`,
      hashtags: this.extractHashtags(config).filter((h, i) => i < 3), // LinkedIn: fewer hashtags
      status: 'draft',
    });

    // Save metadata
    const assets: GeneratedAssets = {
      slug,
      imagePaths,
      posts,
      generatedAt: new Date(),
      status: 'draft',
    };

    const metadataPath = path.join(metadataDir, `${slug}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(assets, null, 2));

    return assets;
  }

  /**
   * Generate product mockup image using OpenRouter's vision model (GPT-4o or similar)
   * The vision model can generate images when prompted
   */
  private async generateImages(config: any, outputDir: string, timestamp: string): Promise<string[]> {
    const fs = require('fs');
    const path = require('path');

    // Create a prompt for a product mockup based on MVP config
    const prompt = this.createImagePrompt(config);

    try {
      // Use OpenRouter with a model that supports image generation
      // Note: GPT-4o doesn't generate images, it only analyzes them
      // For image generation, we need DALL-E 3 or Stable Diffusion via OpenRouter
      const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'stability-ai/sdxl-turbo', // or 'openai/dall-e-3'
          prompt: prompt,
          n: 2, // Generate 2 images
          size: '1024x1024',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter image generation failed: ${error}`);
      }

      const data = await response.json();
      const images = data.data || [];

      const imagePaths: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i].url;
        if (!imageUrl) continue;

        // Download the image
        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();

        const filename = `${timestamp}-${i + 1}.png`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, buffer);
        imagePaths.push(filepath);
      }

      return imagePaths;
    } catch (error: any) {
      console.error('Image generation failed:', error);
      // Create a placeholder image instead
      return await this.createPlaceholderImages(outputDir, timestamp, config.name);
    }
  }

  /**
   * Create simple placeholder images if AI generation fails
   */
  private async createPlaceholderImages(outputDir: string, timestamp: string, productName: string): Promise<string[]> {
    const fs = require('fs');
    const path = require('path');

    // Create a simple SVG placeholder
    const svgContent = `
      <svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="1024" height="1024" fill="#f0f0f0"/>
        <text x="512" y="480" font-family="Arial, sans-serif" font-size="48" fill="#333" text-anchor="middle">
          ${productName}
        </text>
        <text x="512" y="550" font-family="Arial, sans-serif" font-size="32" fill="#666" text-anchor="middle">
          Product Mockup
        </text>
      </svg>
    `;

    const filename = `${timestamp}-placeholder.svg`;
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, svgContent);

    return [filepath];
  }

  /**
   * Create a detailed prompt for image generation based on MVP config
   */
  private createImagePrompt(config: any): string {
    const { name, tagline, description, features } = config;

    const featureList = features.slice(0, 3).map((f: any) => f.title).join(', ');

    return `
      Create a modern, professional product mockup for a SaaS application called "${name}".
      Tagline: "${tagline}"

      The image should show:
      - A clean, minimalist dashboard or app interface
      - Modern design with a professional color scheme (blues, purples, or greens)
      - UI elements that represent: ${featureList || 'productivity, collaboration, analytics'}
      - High resolution, 1024x1024 pixels
      - Suitable for social media posts (Twitter, LinkedIn)
      - Include subtle gradients and modern shadows
      - Make it look like a real, polished product

      Style: Modern SaaS, professional, clean, tech startup aesthetic.
      Do not include text in the image (no words on screen).
    `.trim();
  }

  /**
   * Generate Twitter caption (280 chars max)
   */
  private generateTwitterCaption(config: any): string {
    const { name, tagline, description, hero, pricing } = config;
    const priceInfo = pricing.plans && pricing.plans.length > 0
      ? `Starting at ${pricing.currency} ${pricing.plans[0].price}/${pricing.plans[0].period.replace('^/', '')}`
      : '';

    let caption = `🚀 Just launched: ${name}\n\n`;
    caption += `${tagline}\n\n`;

    if (description && description.length > 0) {
      const shortDesc = description.length > 100
        ? description.substring(0, 97) + '...'
        : description;
      caption += `${shortDesc}\n\n`;
    }

    if (priceInfo) {
      caption += `💰 ${priceInfo}\n`;
    }

    if (hero.ctaUrl) {
      caption += `🔗 ${hero.ctaUrl}`;
    }

    // Ensure under 280 chars (leave room for hashtags)
    const maxContentLength = 240;
    if (caption.length > maxContentLength) {
      caption = caption.substring(0, maxContentLength - 3) + '...';
    }

    return caption;
  }

  /**
   * Generate LinkedIn caption (longer, professional tone)
   */
  private async generateLinkedInCaption(config: any): Promise<string> {
    const { name, tagline, description, features, hero } = config;

    const featureBullets = features.slice(0, 4).map((f: any) => `• ${f.title}: ${f.description}`).join('\n');

    const caption = `
## Introducing ${name}: ${tagline}

We're thrilled to announce the launch of ${name}! After months of development, we're excited to bring you a solution that ${description.split('.')[0].toLowerCase()}.

### What makes ${name} special?

${featureBulcles}

### Who is this for?

${name} is perfect for teams and individuals looking to streamline their workflow and achieve better results. Whether you're a startup, a growing business, or an established enterprise, our platform adapts to your needs.

### Get started today

👉 Visit us at: ${hero.ctaUrl || 'https://example.com'}

We'd love your feedback! Try it out and let us know what you think.

#SaaS #TechStartup #ProductLaunch #${name.replace(/\s/g, '')} #Innovation #Productivity
    `.trim();

    return caption;
  }

  /**
   * Extract relevant hashtags from config
   */
  private extractHashtags(config: any): string[] {
    const hashtags = ['SaaS', 'MVP', 'TechStartup', 'ProductLaunch'];

    // Add feature-based hashtags
    if (config.features) {
      config.features.slice(0, 2).forEach((f: any) => {
        const cleanTitle = f.title.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanTitle && !hashtags.includes(cleanTitle)) {
          hashtags.push(cleanTitle);
        }
      });
    }

    return hashtags;
  }

  /**
   * Load existing generated assets for an MVP
   */
  loadAssets(slug: string): GeneratedAssets | null {
    const fs = require('fs');
    const path = require('path');

    const metadataPath = path.join(this.baseOutputDir, 'metadata', `${slug}.json`);

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    const data = fs.readFileSync(metadataPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Update status of posts
   */
  updatePostStatus(slug: string, platform: string, status: 'draft' | 'scheduled' | 'posted', jobId?: string): void {
    const assets = this.loadAssets(slug);
    if (!assets) return;

    const post = assets.posts.find(p => p.platform === platform);
    if (post) {
      post.status = status;
      if (status === 'scheduled' && jobId) {
        post.jobId = jobId;
      }
      if (status === 'posted' && jobId) {
        post.postedAt = new Date();
        post.jobId = jobId;
      }

      const metadataPath = path.join(this.baseOutputDir, 'metadata', `${slug}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(assets, null, 2));
    }
  }

  /**
   * List all generated assets
   */
  listGenerated(): GeneratedAssets[] {
    const fs = require('fs');
    const path = require('path');

    const metadataDir = path.join(this.baseOutputDir, 'metadata');
    if (!fs.existsSync(metadataDir)) {
      return [];
    }

    const files = fs.readdirSync(metadataDir).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(metadataDir, file), 'utf-8'));
      return data;
    });
  }
}

// Singleton instance
export const socialMediaGenerator = new SocialMediaGenerator();

// Export utility functions
export const fs = require('fs');
export const path = require('path');
