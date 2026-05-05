import { useEffect, useRef } from "react";
import * as d3 from "d3";
import turkey from "../data/turkey.json";

export default function Map({ data = [], theme }) {
  const ref = useRef();
  const tooltipRef = useRef();

  const normalize = (s) =>
    s?.toString().trim()
      .replace(/İ/g, "i")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");

  useEffect(() => {
    if (!tooltipRef.current) {
      tooltipRef.current = d3.select("body")
        .append("div")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "5px 10px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "5px")
        .style("pointer-events", "none")
        .style("opacity", 0);
    }
    const tooltip = tooltipRef.current;

    const width = 800;
    const height = 600;

    const svg = d3.select(ref.current)
      .attr("width", width)
      .attr("height", height);

    const projection = d3.geoMercator()
      .fitSize([width, height], turkey);

    const path = d3.geoPath().projection(projection);

    const valueByCity = {};
    data.forEach(d => {
      valueByCity[normalize(d.city)] = +d.value;
    });

    // Clear before rebuilding
    svg.selectAll("*").remove();

    const interpolators = {
      Blues: d3.interpolateBlues,
      Reds: d3.interpolateReds,
      Greens: d3.interpolateGreens,
      Viridis: d3.interpolateViridis
    };

    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data, d => +d.value) || 0])
      .interpolator(interpolators[theme] || d3.interpolateBlues);

    // Gradient definition
    const legendWidth = 150;
    const legendHeight = 15;

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    d3.range(0, 1.01, 0.1).forEach(t => {
      linearGradient.append("stop")
        .attr("offset", `${t * 100}%`)
        .attr("stop-color", colorScale(
          colorScale.domain()[0] + t * (colorScale.domain()[1] - colorScale.domain()[0])
        ));
    });

    // Map paths
    svg.selectAll("path")
      .data(turkey.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d => {
        const name = normalize(d.properties.name);
        const value = valueByCity[name];
        return value != null ? colorScale(value) : "#eee";
      })
      .attr("stroke", "#333")
      .on("mouseover", (event, d) => {
        const name = d.properties.name;
        const value = valueByCity[normalize(name)];
        tooltip
          .style("opacity", 1)
          .html(`${name}: ${value ?? "No data"}`);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
      });

    // Legend (horizontal, bottom-center)
    const legendX = (width - legendWidth) / 2 + 300;
    const legendY = height - 170;

    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
      .call(d3.axisBottom(legendScale).ticks(5));

  }, [data, theme]);

  return <svg ref={ref}></svg>;
}
