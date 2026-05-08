import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function Map({ data = [], theme, geoData, mapName }) {
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
    const LIMIT_LAT = 71;
    const LIMIT_LON_EAST = 45;
    const LIMIT_LON_WEST = -25;
    const processedFeatures = mapName === "europe"
  ? geoData.features.map(f => {
      const countryName = f.properties?.name || f.id || "";
      
      // Sadece bu ülkelerin içindeki "parçaları" (adaları) kontrol et
      const countriesWithIslands = ["Russia", "Norway", "France"];

      if (countriesWithIslands.some(c => countryName.includes(c))) {
        const isMulti = f.geometry.type === "MultiPolygon";
        const coords = isMulti ? f.geometry.coordinates : [f.geometry.coordinates];

        // Ülkenin her bir parçasını (adasını) tek tek kontrol et
        const filteredCoords = coords.filter(polygon => {
          try {
            const pt = isMulti ? polygon[0][0] : polygon[0];
            const lat = pt[1];
            const lon = pt[0];

            // 1. Çok kuzeydeki adaları at (Svalbard vb.)
            if (lat > LIMIT_LAT) return false;
            
            // 2. Çok batıdaki (denizaşırı) parçaları at
            if (lon < LIMIT_LON_WEST) return false;

            // 3. RUSYA ANAKARASI İÇİN ÖZEL DURUM: 
            // Eğer parça çok büyükse (anakara ise) boylam sınırına bakma, kalsın.
            // Küçük bir ada ise ve çok doğudaysa onu at.
            if (countryName.includes("Russia") && lon > LIMIT_LON_EAST) {
              // Eğer bu parça Rusya'nın anakarasıysa (nokta sayısı çoksa) tut
              return polygon[0].length > 100; 
            }

            return true;
          } catch (e) { return true; }
        });

        return {
          ...f,
          geometry: {
            ...f.geometry,
            coordinates: isMulti ? filteredCoords : (filteredCoords[0] || coords[0])
          }
        };
      }
      return f; // Diğer ülkeler (Polonya vb.) dokunulmadan kalır
    })
  : geoData.features;

    const finalGeoData = { ...geoData, features: processedFeatures };

    const svg = d3.select(ref.current)
      .attr("width", width)
      .attr("height", height);
  svg.selectAll("*").remove();

    if (!finalGeoData || !finalGeoData.features) return;
    
    // --- YENİ MANTIK ---
    let projection;

    if (mapName === "usa") {
      // D3'ün sihirli USA projeksiyonu (Alaska'yı taşıyan)
      projection = d3.geoAlbersUsa().fitSize([width, height], geoData);
    } else {
      // Türkiye ve Avrupa için standart Mercator
      projection = d3.geoMercator().fitSize([width, height], finalGeoData);
    }

    const path = d3.geoPath().projection(projection);

    const valueByCity = {};
    data.forEach(d => {
      valueByCity[normalize(d.city)] = +d.value;
    });


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
      .data(finalGeoData.features)
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

  }, [data, theme, geoData, mapName]);

  return <svg ref={ref}></svg>;
}
