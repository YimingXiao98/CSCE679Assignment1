// ─── Configuration ────────────────────────────────────────────────────────────
const CONFIG = {
  svg: {
    width: 1150,
    height: 720,
    margin: { top: 55, right: 130, bottom: 30, left: 110 }
  },
  cell: {
    // cellWidth is computed dynamically from the number of years in the data.
    height: 52,
    sparkPadX: 4,
    sparkPadY: 5
  },
  legend: {
    barWidth: 18,
    barHeight: 260,
    tickCount: 5
  },
  colors: {
    maxLine: "#22a84a",  // green — daily max sparkline
    minLine: "#d8d8d8",  // light gray — daily min sparkline
    border: "#7b8ea6",
    // Temperature palette: dark-blue (cold) → cyan → green → yellow → red → dark-red (hot)
    palette: d3.interpolateTurbo
  },
  // Fixed Celsius range shown in the legend, matching the reference.
  tempDomain: [0, 40],
  monthNames: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
};

// ─── Formatters ───────────────────────────────────────────────────────────────
const parseDate   = d3.timeParse("%Y-%m-%d");
const formatMonth = d3.timeFormat("%Y-%m");
const formatTemp  = d3.format(".0f");

// ─── Color scale (fixed domain — same across all cells) ───────────────────────
const colorScale = d3.scaleSequential(CONFIG.colors.palette)
  .domain(CONFIG.tempDomain)
  .clamp(true);

// ─── SVG & layer setup ────────────────────────────────────────────────────────
const svg = d3.select("#chart")
  .attr("width",  CONFIG.svg.width)
  .attr("height", CONFIG.svg.height);

const tooltip = d3.select("#tooltip");

const chartRoot = svg.append("g")
  .attr("transform", `translate(${CONFIG.svg.margin.left},${CONFIG.svg.margin.top})`);

const layers = {
  grid:   chartRoot.append("g").attr("class", "grid"),
  years:  chartRoot.append("g").attr("class", "years"),
  months: chartRoot.append("g").attr("class", "months"),
  legend: svg.append("g").attr("class", "legend")
};

// ─── Vertical gradient for the legend bar ─────────────────────────────────────
const defs = svg.append("defs");
const legendGradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%").attr("x2", "0%")   // vertical
  .attr("y1", "0%").attr("y2", "100%"); // top = 0°C, bottom = 40°C

// Populate gradient stops at 5% intervals.
d3.range(0, 1.001, 0.05).forEach(t => {
  legendGradient.append("stop")
    .attr("offset", `${t * 100}%`)
    .attr("stop-color", colorScale(
      CONFIG.tempDomain[0] + t * (CONFIG.tempDomain[1] - CONFIG.tempDomain[0])
    ));
});

// ─── Data aggregation ─────────────────────────────────────────────────────────
// Groups daily rows into monthly records, each carrying the original daily
// values array plus pre-computed monthly max and min.
function toMonthlyRecords(dailyData) {
  const validRows = dailyData.filter(d => d.date instanceof Date && !Number.isNaN(d.date));

  return d3.groups(validRows, d => `${d.date.getFullYear()}-${d.date.getMonth()}`)
    .map(([, values]) => {
      values.sort((a, b) => a.date - b.date);
      const firstDate = values[0].date;
      const year  = firstDate.getFullYear();
      const month = firstDate.getMonth();
      return {
        year,
        month,
        monthDate: new Date(year, month, 1),
        values,
        maxValue: d3.max(values, d => d.max),
        minValue: d3.min(values, d => d.min)
      };
    })
    .sort((a, b) => a.monthDate - b.monthDate);
}

// ─── Layout ───────────────────────────────────────────────────────────────────
// Derives cell width dynamically so all year columns fit the available space.
function createLayout(monthlyRecords) {
  const years = Array.from(new Set(monthlyRecords.map(d => d.year))).sort((a, b) => a - b);
  const innerWidth = CONFIG.svg.width - CONFIG.svg.margin.left - CONFIG.svg.margin.right;
  const cellW      = Math.floor(innerWidth / years.length);
  const chartWidth  = years.length * cellW;
  const chartHeight = 12 * CONFIG.cell.height;

  const xScale = d3.scaleBand().domain(years).range([0, chartWidth]);
  const yScale = d3.scaleBand().domain(d3.range(12)).range([0, chartHeight]);

  return { years, chartWidth, chartHeight, xScale, yScale, cellW };
}

// ─── Axis labels ──────────────────────────────────────────────────────────────
function drawAxisLabels(layout) {
  // Year labels above each column.
  layers.years.selectAll("text")
    .data(layout.years)
    .join("text")
    .attr("class", "year-label")
    .attr("x", d => layout.xScale(d) + layout.cellW / 2)
    .attr("y", -12)
    .attr("text-anchor", "middle")
    .text(d => d);

  // Month labels to the left of each row.
  layers.months.selectAll("text")
    .data(d3.range(12))
    .join("text")
    .attr("class", "month-label")
    .attr("x", -10)
    .attr("y", d => layout.yScale(d) + CONFIG.cell.height / 2 + 4)
    .attr("text-anchor", "end")
    .text(d => CONFIG.monthNames[d]);
}

// ─── Vertical legend ─────────────────────────────────────────────────────────
// Draws the color bar to the right of the matrix with tick marks showing the
// Celsius values at the fixed 0–40°C domain boundaries.
function createLegend(layout) {
  const legendX = CONFIG.svg.margin.left + layout.chartWidth + 30;
  const legendY = CONFIG.svg.margin.top;

  // Color bar
  layers.legend.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width",  CONFIG.legend.barWidth)
    .attr("height", CONFIG.legend.barHeight)
    .attr("fill",   "url(#legend-gradient)")
    .attr("stroke", CONFIG.colors.border)
    .attr("stroke-width", 0.8);

  // Axis to the right of the bar (scale maps °C → vertical pixel position).
  const legendScale = d3.scaleLinear()
    .domain(CONFIG.tempDomain)
    .range([legendY, legendY + CONFIG.legend.barHeight]);

  layers.legend.append("g")
    .attr("class", "legend-axis")
    .attr("transform", `translate(${legendX + CONFIG.legend.barWidth}, 0)`)
    .call(
      d3.axisRight(legendScale)
        .ticks(CONFIG.legend.tickCount)
        .tickFormat(v => `${formatTemp(v)} Celsius`)
    );
}

// ─── Sparkline path builder ───────────────────────────────────────────────────
// Builds a single sparkline path for either "max" or "min" daily values.
// Both sparklines in a cell share the same local y-scale (spanning full
// max-to-min range) so they sit correctly relative to each other.
function buildSparkPath(record, valueKey, cellW, sharedYScale) {
  const values = record.values.map(v => v[valueKey]);
  const line   = d3.line()
    .x((d, i, arr) => {
      // Guard against single-day months to avoid division by zero.
      const maxIdx = Math.max(arr.length - 1, 1);
      return CONFIG.cell.sparkPadX + (i / maxIdx) * (cellW - 2 * CONFIG.cell.sparkPadX);
    })
    .y(d => sharedYScale(d));
  return line(values);
}

// Computes a shared y-scale for a cell spanning the full range of both
// max and min daily values in that month.
function cellYScale(record) {
  const allValues = record.values.flatMap(v => [v.max, v.min]);
  return d3.scaleLinear()
    .domain(d3.extent(allValues))
    .nice()
    .range([CONFIG.cell.height - CONFIG.cell.sparkPadY, CONFIG.cell.sparkPadY]);
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// Shows month, monthly max, and monthly min on hover — matching the reference.
function wireTooltip(cells) {
  cells
    .on("mousemove", (event, record) => {
      tooltip
        .style("opacity", 1)
        .style("left", `${event.pageX + 12}px`)
        .style("top",  `${event.pageY - 16}px`)
        .html(
          `Date: ${formatMonth(record.monthDate)}, ` +
          `max: ${formatTemp(record.maxValue)} ` +
          `min: ${formatTemp(record.minValue)}`
        );
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));
}

// ─── Cell rendering ───────────────────────────────────────────────────────────
// Each cell contains:
//   1. A background rect colored by the monthly MAX temperature.
//   2. A border rect for cell separation.
//   3. A green sparkline tracing daily MAX values.
//   4. A gray sparkline tracing daily MIN values.
function renderCells(monthlyRecords, layout) {
  const cells = layers.grid.selectAll("g.cell")
    .data(monthlyRecords)
    .join("g")
    .attr("class", "cell")
    .attr("transform", d => `translate(${layout.xScale(d.year)},${layout.yScale(d.month)})`);

  // Background — color encodes monthly max temperature.
  cells.append("rect")
    .attr("class", "cell-bg")
    .attr("width",  layout.cellW)
    .attr("height", CONFIG.cell.height)
    .attr("rx", 2).attr("ry", 2)
    .attr("fill", d => colorScale(d.maxValue));

  // Thin border overlay.
  cells.append("rect")
    .attr("class", "cell-border")
    .attr("width",  layout.cellW)
    .attr("height", CONFIG.cell.height)
    .attr("rx", 2).attr("ry", 2);

  // Max sparkline (green).
  cells.append("path")
    .attr("class", "sparkline sparkline-max")
    .attr("fill", "none")
    .attr("stroke",       CONFIG.colors.maxLine)
    .attr("stroke-width", 1.2)
    .attr("stroke-opacity", 0.9)
    .attr("d", d => buildSparkPath(d, "max", layout.cellW, cellYScale(d)));

  // Min sparkline (light gray) — uses the same y-scale as the max line.
  cells.append("path")
    .attr("class", "sparkline sparkline-min")
    .attr("fill", "none")
    .attr("stroke",       CONFIG.colors.minLine)
    .attr("stroke-width", 1.2)
    .attr("stroke-opacity", 0.9)
    .attr("d", d => buildSparkPath(d, "min", layout.cellW, cellYScale(d)));

  wireTooltip(cells);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
function initialize(monthlyRecords) {
  const layout = createLayout(monthlyRecords);
  drawAxisLabels(layout);
  createLegend(layout);
  renderCells(monthlyRecords, layout);
}

// Load daily records, aggregate by month, then draw the matrix.
d3.csv("temperature_daily.csv", d => ({
  date: parseDate(d.date),
  max:  +d.max_temperature,
  min:  +d.min_temperature
})).then(data => {
  const monthlyRecords = toMonthlyRecords(data);
  initialize(monthlyRecords);
});
