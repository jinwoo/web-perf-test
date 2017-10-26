import {ArgumentParser} from 'argparse';
import * as puppeteer from 'puppeteer';
import * as stats from 'simple-statistics';

import {drawBoxPlot} from './boxplot';

const {description, version} = require('../../package.json');

const argParser = new ArgumentParser({
  version,
  description,
  addHelp: true,
});
argParser.addArgument(['--show-chrome'], {
  help: 'Make the Chromium browser visible',
  nargs: 0,
  type: Boolean,
  dest: 'showChrome',
});
argParser.addArgument(['url'], {
  help: 'URL of the page to measure',
});
const args = argParser.parseArgs();

const WARMUP_ITERATIONS = 5;
const MIN_ITERATIONS = 25;
const MAX_ITERATIONS = 50;

function getPerfFromPage(
    page: puppeteer.Page, url: string): Promise<PerformanceTiming> {
  return new Promise((resolve) => {
    page.on('load', async () => {
      const perf: PerformanceTiming = await page.evaluate(() => {
        // PerformanceTiming object itself doesn't seem correctly serialized
        // by `evaluate()`. Return a JSON object.
        // NOTE: PerformanceTiming.toJSON() is not standardized yet.
        return window.performance.timing.toJSON();
      });
      resolve(perf);
    });
    page.goto(url);
  });
}

async function getPerfData(
    url: string, headless: boolean): Promise<PerformanceTiming> {
  const browser = await puppeteer.launch({
    headless,
    // Allow non-safe https certificates because many dev sites use test
    // certificiates.
    ignoreHTTPSErrors: true,
  });
  try {
    const page = await browser.newPage();
    // `await` is needed here to prevent browser from closing before perf data
    // is retrieved.
    return await getPerfFromPage(page, url);
  } finally {
    browser.close();
  }
}

function isMedianStable(loadTimes: number[]): boolean {
  // median is considered stable when interquartile range is <= 1%.
  // https://docs.google.com/document/d/1K0NykTXBbbbTlv60t5MyJvXjqKGsCVNYHyLEXIxYMv0/edit?usp=sharing
  // https://en.wikipedia.org/wiki/Interquartile_range
  const iqr = stats.interquartileRange(loadTimes);
  const median = stats.median(loadTimes);
  return iqr / median <= 0.01;
}

function reportLoadTimeStats(sortedLoadTimes: number[]): void {
  const median = stats.medianSorted(sortedLoadTimes);
  const q1 = stats.quantileSorted(sortedLoadTimes, 0.25);
  const q3 = stats.quantileSorted(sortedLoadTimes, 0.75);
  const iqr = q3 - q1;
  const iqrPercent = (iqr / median * 100).toFixed(2);
  const innerLowerFence = q1 - 1.5 * iqr;
  const innerUpperFence = q3 + 1.5 * iqr;
  const outerLowerFence = q1 - 3 * iqr;
  const outerUpperFence = q3 + 3 * iqr;
  const outliers =
      sortedLoadTimes.filter((x) => x < innerLowerFence || x > innerUpperFence);
  const min = stats.minSorted(sortedLoadTimes);
  const max = stats.maxSorted(sortedLoadTimes);

  console.log('load time statistics:');
  console.log();
  drawBoxPlot({
    median,
    q1,
    q3,
    innerLowerFence,
    innerUpperFence,
    outerLowerFence,
    outerUpperFence,
    min,
    max,
    outliers,
    width: 50,
  });
  console.log();
  console.log(`  samples   : ${sortedLoadTimes.length}`);
  console.log(`  median    : ${median} msec`);
  console.log(`  IQR       : ${iqr} msec (${iqrPercent}%)`);
  console.log(`  min       : ${min} msec`);
  console.log(`  max       : ${max} msec`);
  console.log(`  # outliers: ${outliers.length}`);
}

async function measureAverageLoadTime(
    url: string, headless: boolean): Promise<void> {
  console.log('warming up server...');
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    await getPerfData(url, headless);
  }

  const loadTimes: number[] = [];
  let isStable = true;
  let iterations = 0;
  for (;;) {
    iterations++;
    process.stdout.write(`measuring #${iterations}: `);
    const perf = await getPerfData(url, headless);
    const loadTime = perf.loadEventEnd - perf.requestStart;
    console.log(`${loadTime} msec`);
    loadTimes.push(loadTime);
    if (iterations >= MIN_ITERATIONS) {
      if (isMedianStable(loadTimes)) break;
      if (iterations >= MAX_ITERATIONS) {
        isStable = false;
        break;
      }
    }
  }
  console.log(`${'-'.repeat(50)}`);
  if (!isStable) {
    console.warn(`median is not stable after ${iterations} iterations`);
  }
  loadTimes.sort((a, b) => a - b);
  reportLoadTimeStats(loadTimes);
}

async function main() {
  try {
    await measureAverageLoadTime(args.url, !args.showChrome);
  } catch (err) {
    console.error(err);
  }
}

main();
