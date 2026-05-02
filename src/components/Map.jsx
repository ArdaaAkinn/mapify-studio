import { useEffect, useRef } from "react";
import * as d3 from "d3";
import turkey from "../data/turkey.json";

export default function Map() {
  const ref = useRef();

  useEffect(() => {
    const width = 800;
    const height = 600;

    const svg = d3.select(ref.current)
      .attr("width", width)
      .attr("height", height);

    const projection = d3.geoMercator()
      .fitSize([width, height], turkey);

    const path = d3.geoPath().projection(projection);

    svg.selectAll("*").remove();

    svg.selectAll("path")
      .data(turkey.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "#e5e5e5")
      .attr("stroke", "#333");

  }, []);

  return <svg ref={ref}></svg>;
}