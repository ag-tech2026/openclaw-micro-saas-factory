import Link from 'next/link';
import { LandingPageConfig } from '@/lib/landing-config';

interface FooterProps {
  config: LandingPageConfig;
}

const socialIcons: Record<string, string> = {
  twitter: '⟐',
  github: '◉',
  linkedin: 'in',
  facebook: 'f',
  instagram: '📷',
  discord: '💬',
};

export default function Footer({ config }: FooterProps) {
  const { footer } = config;
  const currentYear = new Date().getFullYear();

  const copyright = footer.copyright
    .replace('{year}', currentYear.toString())
    .replace('{company}', config.name);

  return (
    <footer className="bg-gray-900 dark:bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold mb-4">{config.name}</h3>
            {footer.tagline && (
              <p className="text-gray-400 mb-6 max-w-md">{footer.tagline}</p>
            )}
            {/* Social links */}
            {footer.socialLinks && footer.socialLinks.length > 0 && (
              <div className="flex space-x-4">
                {footer.socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
                    aria-label={`Follow us on ${social.platform}`}
                  >
                    <span className="text-sm">{socialIcons[social.platform] || social.platform[0]}</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links columns */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footer.links?.slice(0, Math.ceil(footer.links.length / 2)).map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.url}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footer.links?.slice(Math.ceil(footer.links.length / 2)).map((link, index) => (
                <li key={index}>
                  <Link
                    href={link.url}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          <p>{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
