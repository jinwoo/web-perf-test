export interface BoxPlotData {
  median: number;
  q1: number;
  q3: number;
  innerLowerFence: number;
  innerUpperFence: number;
  outerLowerFence: number;
  outerUpperFence: number;
  min: number;
  max: number;
  outliers: number[];
  width: number;
}

export function drawBoxPlot({
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
  width,
}: BoxPlotData) {
  if (width <= 0) return;

  const ratio = (width - 1) / (max - min);
  const project = (x: number): number => Math.round((x - min) * ratio);
  const loWhisker = Math.max(min, innerLowerFence);
  const upWhisker = Math.min(max, innerUpperFence);
  const p1 = project(loWhisker);
  const p2 = project(q1);
  const p3 = project(median);
  const p4 = project(q3);
  const p5 = project(upWhisker);

  const buf1 = Array.from({length: width}, () => ' ');
  const buf2 = Array.from({length: width}, () => ' ');
  const buf3 = Array.from({length: width}, () => ' ');

  // upper line
  buf1[p2] = '┌';
  buf1.fill('─', p2 + 1, p3);
  buf1[p3] = '┬';
  buf1.fill('─', p3 + 1, p4);
  buf1[p4] = '┐';

  // middle line
  buf2[p1] = '├';
  buf2.fill('─', p1 + 1, p2);
  buf2[p2] = '┤';
  buf2[p3] = '│';
  buf2[p4] = '├';
  buf2.fill('─', p4 + 1, p5);
  buf2[p5] = '┤';

  // lower line
  buf3[p2] = '└';
  buf3.fill('─', p2 + 1, p3);
  buf3[p3] = '┴';
  buf3.fill('─', p3 + 1, p4);
  buf3[p4] = '┘';

  // outliers
  const isFarOut = (x: number) => x < outerLowerFence || x > outerUpperFence;
  for (const o of outliers) {
    buf2[project(o)] = isFarOut(o) ? '✳' : '○';
  }

  console.log(`${buf1.join('')}`);
  console.log(`${buf2.join('')}`);
  console.log(`${buf3.join('')}`);
}
