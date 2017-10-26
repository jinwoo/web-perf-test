# `web-perf-test`: Web performance measuring tool using Puppeteer

This is a pretty simple CLI tool for measuring the initial page loading time
of a web site, using
[Puppeteer](https://developers.google.com/web/tools/puppeteer/).

It measures until the timing data is considered stable and prints out the
statistics together with a [box plot](https://en.wikipedia.org/wiki/Box_plot).

## Usage

```
usage: web-perf-test [-h] [-v] [--show-chrome] url

Automated web performance test using Puppeteer.

Positional arguments:
  url            URL of the page to measure

Optional arguments:
  -h, --help     Show this help message and exit.
  -v, --version  Show program's version number and exit.
  --show-chrome  Make the Chromium browser visible
```

## What is measured?

`web-perf-test` loads the given page using Puppeteer and evaluates the
loading time using the
[`PerformanceTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming)
data in the browser.

More specifically, it calculates `loadEventEnd - requestStart`.
[`loadEventEnd`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming/loadEventEnd)
represents the moment when the load event is completed, and
[`requestStart`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming/requestStart)
represents the moment when the browser sent the request to obtain the actual
document.

## How are the data measured?

The loading time is measured at least 25 times. After that, the tool checks
if the data is stable. If it is not stable, keep measuring until it becomes
stable or the total number of measurements is 50.

The data is considered stable when the median is stable, which means that its
[interquartile range
(IQR)](https://en.wikipedia.org/wiki/Interquartile_range) is <= 1% of the
median. The idea is borrowed from the [*Rules of Thumb for HTTP/2
Push*](https://docs.google.com/document/d/1K0NykTXBbbbTlv60t5MyJvXjqKGsCVNYHyLEXIxYMv0/edit?usp=sharing)
document.
