const Apify = require('apify');
const { PuppeteerCrawler } = require('crawlee');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { subreddit = 'popular', maxPosts = 100, proxyConfiguration } = input;

    console.log('Starting Reddit scraper...');
    const proxyConfig = await Apify.createProxyConfiguration(proxyConfiguration);
    
    const crawler = new PuppeteerCrawler({
        proxyConfiguration: proxyConfig,
        requestHandler: async ({ page, request }) => {
            await page.waitForSelector('[data-testid="post-container"]', { timeout: 30000 });
            
            const posts = await page.evaluate((maxPosts) => {
                const postElements = document.querySelectorAll('[data-testid="post-container"]');
                const results = [];
                
                for (let i = 0; i < Math.min(postElements.length, maxPosts); i++) {
                    const post = postElements[i];
                    const titleElement = post.querySelector('h3');
                    const authorElement = post.querySelector('[data-testid="post_author_link"]');
                    
                    results.push({
                        title: titleElement?.textContent?.trim() || '',
                        author: authorElement?.textContent?.trim() || '',
                        scraped_at: new Date().toISOString()
                    });
                }
                
                return results;
            }, maxPosts);
            
            await Apify.pushData(posts);
        }
    });

    await crawler.addRequests([{ url: `https://www.reddit.com/r/${subreddit}/` }]);
    await crawler.run();
});