const { crawlSite } = require("./crawl.js");

function printReport(pages) {
  console.log("\n===== CRAWL REPORT =====");

  const sortedPages = Object.entries(pages).sort(
    (a, b) => b[1] - a[1]
  );

  for (const [url, count] of sortedPages) {
    console.log(`${count} incoming links: ${url}`);
  }

  console.log(`\nTotal discovered pages: ${sortedPages.length}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.log("Usage: npm start -- https://example.com");
    process.exitCode = 1;
    return;
  }

  const baseURL = args[0];

  try {
    console.log(`Starting crawler: ${baseURL}`);

    const pages = await crawlSite(baseURL);

    printReport(pages);

    console.log("\nFinished crawling.");
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();