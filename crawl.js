const { JSDOM } = require("jsdom");

function normalizeURL(urlString) {
  const url = new URL(urlString);

  const host = url.host.toLowerCase();
  const path = url.pathname.replace(/\/+$/, "");

  return host + path;
}

function getURLsFromHTML(html, baseURL) {
  const dom = new JSDOM(html);
  const links = dom.window.document.querySelectorAll("a[href]");

  const urls = [];

  for (const link of links) {
    try {
      const url = new URL(link.getAttribute("href"), baseURL);

      if (url.protocol === "http:" || url.protocol === "https:") {
        urls.push(url.href);
      }
    } catch {
    }
  }

  return urls;
}

async function crawlSite(baseURL, options = {}) {
  const maxPages = options.maxPages ?? 50;

  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("maxPages must be a positive integer");
  }

  const startURL = new URL(baseURL);

  if (!["http:", "https:"].includes(startURL.protocol)) {
    throw new Error("URL must use HTTP or HTTPS");
  }

  const visited = new Set();
  const pages = Object.create(null);

  async function crawlPage(currentURL) {
    const url = new URL(currentURL);

    if (url.origin !== startURL.origin) {
      return;
    }

    const normalizedURL = normalizeURL(url.href);

    if (visited.has(normalizedURL)) {
      return;
    }

    if (visited.size >= maxPages) {
      return;
    }

    visited.add(normalizedURL);
    pages[normalizedURL] ??= 0;

    console.log(`Crawling: ${url.href}`);

    try {
      const response = await fetch(url.href, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.log(`HTTP error: ${response.status}`);
        return;
      }

      const contentType = response.headers.get("content-type");

      if (
        contentType &&
        !contentType.toLowerCase().includes("text/html")
      ) {
        return;
      }

      const html = await response.text();
      const urls = getURLsFromHTML(html, url.href);

      for (const nextURL of urls) {
        const parsedURL = new URL(nextURL);

        if (parsedURL.origin !== startURL.origin) {
          continue;
        }

        const normalizedNextURL = normalizeURL(nextURL);

        pages[normalizedNextURL] ??= 0;
        pages[normalizedNextURL]++;

        await crawlPage(nextURL);
      }
    } catch (error) {
      console.log(`Failed to crawl ${url.href}: ${error.message}`);
    }
  }

  await crawlPage(startURL.href);

  return pages;
}

module.exports = {
  normalizeURL,
  getURLsFromHTML,
  crawlSite,
};