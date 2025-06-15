import { Router } from 'express';
import { db } from '../db';
import { savedDecks } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Dynamic sitemap generation
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Get public decks for dynamic URLs
    const publicDecks = await db
      .select({ id: savedDecks.id, updatedAt: savedDecks.updatedAt })
      .from(savedDecks)
      .where(eq(savedDecks.isPublic, true))
      .limit(100); // Limit to prevent sitemap from being too large

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Public Decks Page -->
  <url>
    <loc>${baseUrl}/public-decks</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  
  <!-- Static sections -->
  <url>
    <loc>${baseUrl}/#ai-assistant</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/#features</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <url>
    <loc>${baseUrl}/#faq</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;

    // Add public deck URLs
    for (const deck of publicDecks) {
      const lastMod = deck.updatedAt ? deck.updatedAt.toISOString().split('T')[0] : currentDate;
      sitemap += `
  
  <url>
    <loc>${baseUrl}/deck-view/${deck.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    }

    sitemap += `
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt route
router.get('/robots.txt', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Allow indexing of main pages
Allow: /
Allow: /public-decks
Allow: /deck-view/*

# Disallow user-specific and private pages
Disallow: /admin
Disallow: /my-decks
Disallow: /deck-builder
Disallow: /reset-password

# Disallow API endpoints
Disallow: /api/

# Allow search engines to access static assets
Allow: /images/
Allow: /fonts/
Allow: *.css
Allow: *.js

# Crawl delay (optional - be respectful)
Crawl-delay: 1`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

export default router;