const {
  normalizeURL,
  getURLsFromHTML,
  crawlSite,
} = require("./crawl.js");

const { test, expect, afterEach } = require("@jest/globals");

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test("normalizeURL removes protocol and trailing slash", () => {
  const input = "https://example.com/about/";
  const actual = normalizeURL(input);
  const expected = "example.com/about";

  expect(actual).toEqual(expected);
});

test("normalizeURL handles different protocols", () => {
  const first = normalizeURL("https://example.com/about");
  const second = normalizeURL("http://example.com/about/");

  expect(first).toEqual(second);
});

test("normalizeURL keeps non-default ports", () => {
  const actual = normalizeURL("http://localhost:3000/products/");

  expect(actual).toEqual("localhost:3000/products");
});

test("getURLsFromHTML extracts relative and absolute links", () => {
  const html = `
    <html>
      <body>
        <a href="/about">About</a>
        <a href="https://example.com/products">Products</a>
        <a href="mailto:hello@example.com">Email</a>
      </body>
    </html>
  `;

  const actual = getURLsFromHTML(html, "https://example.com");

  expect(actual).toEqual([
    "https://example.com/about",
    "https://example.com/products",
  ]);
});

test("crawlSite visits each internal page once", async () => {
  const htmlByURL = {
    "https://example.com/": `
      <a href="/about">About</a>
      <a href="/about/">About again</a>
      <a href="https://other.com">External</a>
    `,
    "https://example.com/about": `
      <a href="/">Home</a>
    `,
  };

  global.fetch = jest.fn(async (url) => {
    const key = normalizeURL(url);

    const html = Object.entries(htmlByURL).find(
      ([pageURL]) => normalizeURL(pageURL) === key
    )?.[1];

    if (html === undefined) {
      return {
        ok: false,
        status: 404,
      };
    }

    return {
      ok: true,
      headers: {
        get: () => "text/html",
      },
      text: async () => html,
    };
  });

  const pages = await crawlSite("https://example.com", {
    maxPages: 10,
  });

  expect(pages["example.com"]).toBe(1);
  expect(pages["example.com/about"]).toBe(2);
  expect(global.fetch).toHaveBeenCalledTimes(2);
});