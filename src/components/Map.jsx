import { useEffect, useRef } from "react";
import * as d3 from "d3";

const visualLabelAliases = {
  europe: {
    "Bosnia and Herz.": "Bosnia",
    "Czechia": "Czech Rep.",
    "North Macedonia": "N. Macedonia",
    "United Kingdom": "UK",
    "Azerbaijan": "Azer.",
    "Armenia": "Arm.",
    "Luxembourg": "Lux.",
  },
  turkey: {
      "Osmaniye": "Osm.",
      "Zonguldak": "Zong.",
      "Sakarya": "Sak.",
      "Gaziantep": "Antep",
      "Gumushane": "Gümüş.",
  },
  usa: {
    "New York": "NY",
    "Mississippi": "Miss.",
    "South Carolina": "S. Carolina",
    "North Carolina": "N. Carolina",
    "New Hampshire": "NH",
    "Rhode Island": "RI",
    "Connecticut": "Conn.",
    "Massachusetts": "Mass.",
    "Washington": "Wash.",
    "Virginia": "Va.",
    "West Virginia": "W. Virginia",
    "Pennsylvania": "Penn.",
    "New Jersey": "NJ",
    "Maryland": "Md.",
    "Delaware": "Del.",
    "Vermont": "Vt.",
    "District of Columbia": "D.C.",
  }
};

const hiddenVisualLabels = {
  europe: [
    "Isle of Man", "Guernsey", "Jersey", "Faroe Islands", "Svalbard and Jan Mayen", "Gibraltar",
    "Holy See", "San Marino", "Andorra", "Monaco", "Liechtenstein", "Kosovo", "North Macedonia", "Vatican", "Montenegro", "Åland", "Malta", "Cyprus", "Faroe Is."
  ],
  turkey: [],
  usa: []
};

const visualLabelCoordinates = {
  europe: {
    Armenia: [44.8, 40.25],
    Azerbaijan: [47.6, 40.35],
    Finland: [26, 64.4],
    Georgia: [43.5, 42.15],
    Germany: [10.4, 51.15],
    Norway: [10, 62.8],
    Russia: [37.5, 56.1],
    "United Kingdom": [-1.5, 53.4]
  },
  turkey: { 
    Gaziantep: [37.55, 37.15],
    Giresun: [38.5, 40.75]},

  usa: {
    Mississippi: [-89.65, 31.7],
    Alabama: [-86.8, 33.4]
  
  }
};

const labelsKeptOnMap = {
  europe: [
    "Armenia",
    "Azerbaijan",
    "Finland",
    "Georgia",
    "Germany",
    "Norway",
    "Russia",
    "United Kingdom"
  ],
  turkey: [ 
    "Gaziantep",
    "Giresun"],

  usa: [
    "Mississippi",
    "Alabama"
  ]
};

export default function Map({
  data = [],
  theme,
  geoData,
  mapName,
  showPlaceNames = false,
  showPlaceValues = false,
  mapTitle = "",
  legendTitle = ""
}) {
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
            } catch { return true; }
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
      //Moves alaska and hawaii to more visible positions
      projection = d3.geoAlbersUsa().fitSize([width, height], geoData);
    }
    else if (mapName === "europe") {

      projection = d3.geoMercator()
        .center([12, 54])
        .scale(570)
        .translate([width / 2, height / 2]);

    }
    else {
      projection = d3.geoMercator().fitSize([width, height], finalGeoData);
    }

    const path = d3.geoPath().projection(projection);

    const valueByCity = {};
    const displayValueByCity = {};
    data.forEach(d => {
      const key = normalize(d.city);
      valueByCity[key] = +d.value;
      if (d.value !== "" && d.value != null) {
        displayValueByCity[key] = d.value;
      }
    });

    const getFeatureName = (feature) =>
      feature.properties.name ||
      feature.properties.NAME ||
      feature.properties.admin ||
      feature.properties.STATE_NAME;

    const getVisualLabel = (name) =>
      visualLabelAliases[mapName]?.[name] || name;

    const shouldShowVisualLabel = (name) =>
      !hiddenVisualLabels[mapName]?.includes(name);

    const getLabelPoint = (feature) => {
      const name = getFeatureName(feature);
      const coordinates = visualLabelCoordinates[mapName]?.[name];
      const point = coordinates ? projection(coordinates) : path.centroid(feature);

      return point || [NaN, NaN];
    };

    const shouldKeepLabelOnMap = (name) =>
      labelsKeptOnMap[mapName]?.includes(name);

    const interpolators = {
      Blues: d3.interpolateBlues,
      Reds: d3.interpolateReds,
      Greens: d3.interpolateGreens,
      Viridis: d3.interpolateViridis
    };

    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data, d => +d.value) || 0])
      .interpolator(interpolators[theme] || d3.interpolateBlues);

    const wrapSvgText = ({
      text,
      content,
      maxWidth,
      x,
      y,
      lineHeight = 14,
      direction = "down"
    }) => {
      const words = content.trim().split(/\s+/);
      const lines = [];
      let line = "";

      const fits = (value) => {
        text.text(value);
        return text.node().getComputedTextLength() <= maxWidth;
      };

      const splitLongWord = (word) => {
        const chunks = [];
        let chunk = "";

        word.split("").forEach(character => {
          const nextChunk = chunk + character;

          if (fits(nextChunk) || chunk.length === 0) {
            chunk = nextChunk;
          } else {
            chunks.push(chunk);
            chunk = character;
          }
        });

        if (chunk) chunks.push(chunk);
        return chunks;
      };

      words.forEach(word => {
        const nextLine = line ? `${line} ${word}` : word;

        if (fits(nextLine)) {
          line = nextLine;
          return;
        }

        if (line) {
          lines.push(line);
        }

        if (fits(word)) {
          line = word;
          return;
        }

        const chunks = splitLongWord(word);
        lines.push(...chunks.slice(0, -1));
        line = chunks[chunks.length - 1] || "";
      });

      if (line) lines.push(line);

      const startY = direction === "up" ? y - (lines.length - 1) * lineHeight : y;

      text.text(null);
      lines.forEach((textLine, index) => {
        text.append("tspan")
          .attr("x", x)
          .attr("y", startY + index * lineHeight)
          .text(textLine);
      });
    };

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

    if (mapTitle.trim()) {
      const titleText = svg.append("text")
        .attr("x", width / 2)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .attr("font-size", 22)
        .attr("font-weight", 700)
        .attr("fill", "#111827")
        .style("font-family", "Arial, sans-serif");

      wrapSvgText({
        text: titleText,
        content: mapTitle,
        maxWidth: width - 48,
        x: width / 2,
        y: 28,
        lineHeight: 26
      });
    }

    defs.append("marker")
      .attr("id", "label-line-arrow")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("refX", 5)
      .attr("refY", 3)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,0 L6,3 L0,6 Z")
      .attr("fill", "#4b5563");

    // Map paths
    svg.append("g")
      .attr("class", "map-shapes")
      .selectAll("path")
      .data(finalGeoData.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", d => {
        const rawName = getFeatureName(d);

        const name = normalize(rawName);
        const value = valueByCity[name];
        return value != null ? colorScale(value) : "#eee";
      })
      .attr("stroke", "#333")
      .on("mouseover", (event, d) => {
        const name = getFeatureName(d);
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

    if (showPlaceNames || showPlaceValues) {
      const labels = svg.append("g")
        .attr("class", "map-labels")
        .attr("pointer-events", "none");

      const labelGroups = labels.selectAll("text")
        .data(finalGeoData.features)
        .enter()
        .append("text")
        .attr("x", d => getLabelPoint(d)[0])
        .attr("y", d => getLabelPoint(d)[1])
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", mapName === "turkey" ? 6 : mapName === "europe" ? 6 : 8)
        .attr("font-weight", 600)
        .attr("fill", "#111827")
        .attr("paint-order", "stroke")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .style("font-family", "Arial, sans-serif")
        .style("filter", "drop-shadow(0 1px 1px rgba(255,255,255,0.65))")
        .style("display", d => {
          const [x, y] = getLabelPoint(d);
          return Number.isFinite(x) && Number.isFinite(y) ? null : "none";
        });

      const drawnVisualLabels = new Set();

      labelGroups.each(function (d) {
        const text = d3.select(this);
        const name = getFeatureName(d);
        const visualName = getVisualLabel(name);
        const value = displayValueByCity[normalize(name)];
        const lines = [];
        const labelKey = normalize(name);

        if (!shouldShowVisualLabel(name) || drawnVisualLabels.has(labelKey)) {
          text.style("display", "none");
          return;
        }

        if (showPlaceNames && visualName) lines.push(visualName);
        if (showPlaceValues && value != null) lines.push(value);

        if (lines.length === 0) {
          text.style("display", "none");
          return;
        }

        drawnVisualLabels.add(labelKey);

        lines.forEach((line, index) => {
          text.append("tspan")
            .attr("x", text.attr("x"))
            .attr("dy", index === 0 ? (lines.length > 1 ? "-0.4em" : "0") : "1em")
            .text(line);
        });
      });

      const labelPadding = 2;
      const overlaps = (a, b) =>
        a.x1 < b.x2 &&
        a.x2 > b.x1 &&
        a.y1 < b.y2 &&
        a.y2 > b.y1;

      const labelInfo = labelGroups.nodes()
        .map((node, index) => {
          if (node.style.display === "none" || node.childNodes.length === 0) return null;

          const box = node.getBBox();
          const datum = labelGroups.data()[index];
          const [anchorX, anchorY] = getLabelPoint(datum);
          const name = getFeatureName(datum);

          return {
            node,
            index,
            anchorX,
            anchorY,
            keepOnMap: shouldKeepLabelOnMap(name),
            box: {
              x1: box.x - labelPadding,
              y1: box.y - labelPadding,
              x2: box.x + box.width + labelPadding,
              y2: box.y + box.height + labelPadding
            }
          };
        })
        .filter(Boolean);

      const collidingIndexes = new Set();

      for (let i = 0; i < labelInfo.length; i++) {
        for (let j = i + 1; j < labelInfo.length; j++) {
          if (overlaps(labelInfo[i].box, labelInfo[j].box)) {
            if (!labelInfo[i].keepOnMap) collidingIndexes.add(labelInfo[i].index);
            if (!labelInfo[j].keepOnMap) collidingIndexes.add(labelInfo[j].index);
          }
        }
      }

      const collidingLabels = labelInfo.filter(label => collidingIndexes.has(label.index));

      if (collidingLabels.length > 0) {
        const leaderLines = svg.insert("g", ".map-labels")
          .attr("class", "map-label-lines")
          .attr("pointer-events", "none");

        const placeSideLabels = (sideLabels, side) => {
          const minY = 18;
          const maxY = height - 18;
          const minGap = showPlaceNames && showPlaceValues ? 14 : 10;
          const labelX = side === "left" ? 12 : width - 12;
          const textAnchor = side === "left" ? "start" : "end";
          const lineEndOffset = side === "left" ? 4 : -4;
          const sorted = [...sideLabels].sort((a, b) => a.anchorY - b.anchorY);

          let nextY = minY;
          sorted.forEach(label => {
            label.labelY = Math.max(minY, Math.min(maxY, label.anchorY));
            label.labelY = Math.max(label.labelY, nextY);
            nextY = label.labelY + minGap;
          });

          let previousY = maxY;
          for (let i = sorted.length - 1; i >= 0; i--) {
            sorted[i].labelY = Math.min(sorted[i].labelY, previousY);
            previousY = sorted[i].labelY - minGap;
          }

          if (sorted[0]?.labelY < minY) {
            const step = sorted.length > 1 ? (maxY - minY) / (sorted.length - 1) : 0;
            sorted.forEach((label, index) => {
              label.labelY = minY + step * index;
            });
          }

          sorted.forEach(label => {
            const text = d3.select(label.node);

            text
              .attr("x", labelX)
              .attr("y", label.labelY)
              .attr("text-anchor", textAnchor);

            text.selectAll("tspan")
              .attr("x", labelX);

            leaderLines.append("line")
              .attr("x1", labelX + lineEndOffset)
              .attr("y1", label.labelY)
              .attr("x2", label.anchorX)
              .attr("y2", label.anchorY)
              .attr("stroke", "#4b5563")
              .attr("stroke-width", 0.8)
              .attr("stroke-opacity", 0.75)
              .attr("marker-end", "url(#label-line-arrow)");
          });
        };

        placeSideLabels(
          collidingLabels.filter(label => label.anchorX < width / 2),
          "left"
        );
        placeSideLabels(
          collidingLabels.filter(label => label.anchorX >= width / 2),
          "right"
        );
      }
    }

    // Legend (horizontal, bottom-center)
    let legendX;
let legendY;

if (mapName === "turkey") {

  legendX = width - 220;
  legendY = height - 120;

} else if (mapName === "europe") {

  legendX = 24;
  legendY = height - 250;

} else if (mapName === "usa") {

  legendX = width - 320;
  legendY = height - 100;

} else {

  legendX = width - 220;
  legendY = height - 120;

}

    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);

    if (legendTitle.trim()) {
      const legendTitleText = svg.append("text")
        .attr("x", legendX)
        .attr("y", legendY - 8)
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", "#111827")
        .style("font-family", "Arial, sans-serif");

      wrapSvgText({
        text: legendTitleText,
        content: legendTitle,
        maxWidth: legendWidth,
        x: legendX,
        y: legendY - 8,
        lineHeight: 14,
        direction: "up"
      });
    }

    svg.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#legend-gradient)");

    svg.append("g")
      .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
      .call(d3.axisBottom(legendScale).ticks(5));

  }, [data, theme, geoData, mapName, showPlaceNames, showPlaceValues, mapTitle, legendTitle]);

  return <svg ref={ref}></svg>;
}
