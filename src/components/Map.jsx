import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function Map() {
  const ref = useRef();

  useEffect(() => {
    const width = 800;
    const height = 500;

    const svg = d3
      .select(ref.current)
      .attr("width", width)
      .attr("height", height)
      .style("border", "1px solid #ccc");

    svg.selectAll("*").remove();

    svg.append("text")
      .attr("x", 20)
      .attr("y", 40)
      .style("font-size", "20px")
      .text("Mapify Studio 🚀 - engine running");

  }, []);

  return <svg ref={ref}></svg>;
}