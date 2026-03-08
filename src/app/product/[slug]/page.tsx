import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadLandingConfig, LandingPageConfig } from '@/lib/landing-config';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Pricing from '@/components/landing/Pricing';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';

interface PageProps {
  params: {
    slug: string;
  };
}

// Generate static params for all configs (for static generation)
export async function generateStaticParams() {
  const fs = await import('fs');
  const path = await import('path');

  const basePath = process.cwd();
  const configDir = path.join(basePath, 'landing-configs');

  if (!fs.existsSync(configDir)) {
    return [];
  }

  const files = fs.readdirSync(configDir);
  const slugs: string[] = [];

  files.forEach((file) => {
    const ext = path.extname(file);
    if (['.json', '.yaml', '.yml'].includes(ext)) {
      const slug = path.basename(file, ext);
      slugs.push({ slug });
    }
  });

  return slugs;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const config = await loadLandingConfig(params.slug);

    const {
      seo: { title, description, image },
      name,
    } = config;

    return {
      title: title || name,
      description: description || config.description,
      openGraph: {
        title: title || name,
        description: description || config.description,
        images: image ? [image] : undefined,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: title || name,
        description: description || config.description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {
      title: 'Product Not Found',
    };
  }
}

// Main page component
export default async function ProductPage({ params }: PageProps) {
  let config: LandingPageConfig;

  try {
    config = await loadLandingConfig(params.slug);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen">
      <Hero config={config} />
      <Features config={config} />
      <Pricing config={config} />
      <FAQ config={config} />
      <Footer config={config} />
    </div>
  );
}
