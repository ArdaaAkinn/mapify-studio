import { useEffect, useRef } from "react";
import * as d3 from "d3";
import turkey from "../data/turkey.json";

export default function Map({ data = [] }) {
  const ref = useRef();
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
    console.log("DATA:", data);
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
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data, d => +d.value) || 0])
      .interpolator(d3.interpolateBlues);

    svg.selectAll("*").remove();

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
      .attr("stroke", "#333");

      
  }, [data]);

  return <svg ref={ref}></svg>;
}