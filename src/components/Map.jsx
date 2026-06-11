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
      "Kahramanmaraş": "K. Maraş.",
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
  },
  canada:
  {
    "British Columbia": "B.C.",
    "Newfoundland and Labrador": "Nfld. & Lab.",
    "Prince Edward Island": "P.E.I.",
    "Saskatchewan": "Sask.",
  },
  italy: {
    "Trentino-Alto Adige/Südtirol": "Trentino",
    "Friuli Venezia Giulia": "Friuli V.G.",
    "Valle d'Aosta/Vallée d'Aoste": "Valle d'Aosta",
  },
  spain: {
    "Castilla-La Mancha": "Castilla L.M.",
    "Castilla y León": "Castilla y L.",
    "Bizkaia/Vizcaya": "B.",
    "Gipuzkoa/Guipúzcoa": "G.",
    "Araba/Álava": "Álava",
    "Illes Balears": "Balears",
    "València/Valencia": "Valencia",
    "Alacant/Alicante": "Alicante",
    "Castelló/Castellón": "Castellón",
  },
  india: {
    "Andaman and Nicobar": "A&N",
    "Jammu and Kashmir": "J&K",
    "Himachal Pradesh": "H.P.",
    "Haryana": "Hary.",
    "Punjab": "Punj.",
    "Arunachal Pradesh": "Arunachal P.",
    "Meghalaya": "Megh.",
    "Uttaranchal": "Uttar.",
    "Nagaland": "Nag.",
    "Jharkhand": "Jharkh.",
    "Tripura": "Tr.",
    "West Bengal": "W. Bengal",
    "Mizoram": "Miz.",
    "Kerala": "Ker.",
    "Chhattisgarh": "Chhatt.",
  },
  indonesia: {
    "BANGKA BELITUNG": "BANGKA B.",
    "KALIMANTAN SELATAN": "KALIM. S.",
    "SUMATERA SELATAN": "SUMATERA S.",
    "DKI JAKARTA": "JAKARTA",
    "JAWA BARAT": "J.BARAT",
    "JAWA TENGAH": "J.TENGAH",
    "JAWA TIMUR": "J.TIMUR",
    "DAERAH ISTIMEWA YOGYAKARTA": "YOGYAK.",
    "NUSATENGGARA BARAT": "NUSA B.",
    "SULAWESI UTARA": "S.UTARA.",
    "IRIAN JAYA TENGAH": "I.J.TENGAH",
    "SULAWESI TENGGARA": "S.TENG.",
    "IRIAN JAYA TIMUR": "I.J.TIMUR",
    "IRIAN JAYA BARAT": "I.J.BARAT",
    "NUSA TENGGARA TIMUR": "NUSA T. TIMUR",
  },
  brazil: {
    "Rio Grande do Norte": "R.Grande N.",
    "Espírito Santo": "Espírito S.",
  },
};

const hiddenVisualLabels = {
  europe: [
    "Isle of Man", "Guernsey", "Jersey", "Faroe Islands", "Svalbard and Jan Mayen", "Gibraltar",
    "Holy See", "San Marino", "Andorra", "Monaco", "Liechtenstein", "Kosovo", "North Macedonia", "Vatican", "Montenegro", "Åland", "Malta", "Cyprus", "Faroe Is."
  ],
  turkey: [],
  usa: [],
  india: ["Chandigarh", "Delhi", "Puducherry", "Dādra and Nagar Haveli and Damān and Diu"],
  brazil: ["Distrito Federal"],
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
  },

  canada: {
    "Northwest Territories": [-115, 64],
    "Nunavut": [-100, 66]
  },
  germany: {
    Brandenburg: [13.7, 52.1]
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
  legendTitle = "",
  mapType = "colored-regions",
  darkBackground = false,
  gradientMin = null,
  gradientMax = null,
  hideNoData = false
}) {
  const ref = useRef();
  const tooltipRef = useRef();

  const ALIASES = {
    turkiye: "turkey",
    "bosnia and herzegovina": "bosnia and herz.",
    "bosnia & herzegovina": "bosnia and herz.",
    bosnia: "bosnia and herz.",
    bih: "bosnia and herz.",
  };

  const normalize = (s) => {
    const n = s?.toString().trim()
      .replace(/İ/g, "i")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
    return ALIASES[n] ?? n;
  };

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
    const CANADA_LAT_LIMIT = 74;
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
      : mapName === "canada"
      ? geoData.features.map(f => {
        if (f.geometry.type !== "MultiPolygon") return f;
        const filtered = f.geometry.coordinates.filter(poly => {
          const minLat = Math.min(...poly[0].map(p => p[1]));
          return minLat <= CANADA_LAT_LIMIT;
        });
        return {
          ...f,
          geometry: { ...f.geometry, coordinates: filtered.length ? filtered : [f.geometry.coordinates[0]] }
        };
      })
      : geoData.features;

    const finalGeoData = { ...geoData, features: processedFeatures };

    const svg = d3.select(ref.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove();

    if (!finalGeoData || !finalGeoData.features) return;

    const textFill        = darkBackground ? "#f1f5f9" : "#111827";
    const noDataFill      = darkBackground ? "#1e293b" : "#eee";
    const circleBaseFill  = darkBackground ? "#1e293b" : "#f3f4f6";
    const pathStroke      = darkBackground ? "rgba(255,255,255,0.14)" : "#333";
    const labelStroke     = darkBackground ? "#0f172a" : "#ffffff";
    const labelShadow     = darkBackground
      ? "drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
      : "drop-shadow(0 1px 1px rgba(255,255,255,0.65))";
    const leaderStroke    = darkBackground ? "rgba(203,213,225,0.55)" : "#4b5563";
    const arrowFill       = darkBackground ? "rgba(203,213,225,0.8)" : "#4b5563";

    if (darkBackground) {
      svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#0f172a");
    }

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
    else if (mapName === "uk") {
      // fitExtent centers on the full bbox, but Eilean Siar extends to -13.7°,
      // pulling the center far west and pushing Great Britain off to the right.
      // Fix: use the same scale from fitExtent, then re-center the translate on -2°
      // (center of Great Britain mainland) instead of the skewed bbox center.
      const topPad = mapTitle.trim() ? 55 : 8;
      projection = d3.geoMercator().fitExtent([[8, topPad], [width - 8, height - 8]], finalGeoData);
      const [, ty] = projection.translate();
      const s = projection.scale();
      projection.translate([width / 2 + s * (2 * Math.PI / 180), ty]);
    }
    else if (mapName === "russia") {
      // Rotate central meridian to 105°E so D3's antimeridian clipper (±180°)
      // lands in the Atlantic, keeping all Russian territory in one piece.
      const topPad = mapTitle.trim() ? 55 : 8;
      projection = d3.geoMercator()
        .rotate([-105, 0, 0])
        .fitExtent([[8, topPad], [width - 8, height - 8]], finalGeoData);
    }
    else {
      const topPad = mapTitle.trim() ? 55 : 8;
      projection = d3.geoMercator().fitExtent([[8, topPad], [width - 8, height - 8]], finalGeoData);
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
      feature.properties.NAME_1 ||
      feature.properties.Estado ||
      feature.properties.Propinsi ||
      feature.properties.name ||
      feature.properties.Name ||
      feature.properties.nom ||
      feature.properties.reg_name ||
      feature.properties.NAME ||
      feature.properties.NUTS_NAME ||
      feature.properties.admin ||
      feature.properties.STATE_NAME ||
      feature.properties.region ||
      feature.properties.county;

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

    const autoMin = 0;
    const autoMax = d3.max(data, d => +d.value) || 0;
    const domainMin = gradientMin != null && gradientMin !== "" ? +gradientMin : autoMin;
    const domainMax = gradientMax != null && gradientMax !== "" ? +gradientMax : autoMax;

    const colorScale = d3.scaleSequential()
      .domain([domainMin, domainMax])
      .interpolator(interpolators[theme] || d3.interpolateBlues);

    const numericValues = data
      .map(d => +d.value)
      .filter(value => Number.isFinite(value));
    const maxValue = d3.max(numericValues) || 0;
    const bubbleSizeScale = d3.scaleSqrt()
      .domain([0, maxValue || 1])
      .range([4, 28]);

    const hasPresenceValue = (value) => {
      if (value == null) return false;
      const textValue = value.toString().trim().toLowerCase();
      if (!textValue) return false;
      if (["0", "false", "no", "none", "absent"].includes(textValue)) return false;
      return true;
    };

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

    // Legend gradient definition
    const legendWidth = 150;
    const legendHeight = 15;

    const defs = svg.append("defs");
    if (mapType === "colored-regions") {
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
    }

    if (mapTitle.trim()) {
      const titleX = mapName === "canada" ? 28 : width / 2;
      const titleY = mapName === "canada" ? 42 : 28;
      const titleAnchor = mapName === "canada" ? "start" : "middle";
      const titleMaxWidth = mapName === "canada" ? 240 : width - 48;

      const titleText = svg.append("text")
        .attr("x", titleX)
        .attr("y", titleY)
        .attr("text-anchor", titleAnchor)
        .attr("font-size", 22)
        .attr("font-weight", 700)
        .attr("fill", textFill)
        .style("font-family", "Arial, sans-serif");

      wrapSvgText({
        text: titleText,
        content: mapTitle,
        maxWidth: titleMaxWidth,
        x: titleX,
        y: titleY,
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
      .attr("fill", arrowFill);

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
        const rawValue = displayValueByCity[name];
        const value = valueByCity[name];

        if (mapType === "two-color-status") {
          return hasPresenceValue(rawValue) ? "#2563eb" : "#dc2626";
        }

        if (mapType === "circles-by-value") {
          return circleBaseFill;
        }

        return value != null ? colorScale(value) : noDataFill;
      })
      .style("display", d => {
        if (!hideNoData) return null;
        const name = normalize(getFeatureName(d));
        return displayValueByCity[name] != null ? null : "none";
      })
      .attr("stroke", pathStroke)
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

    if (mapType === "circles-by-value") {
      svg.append("g")
        .attr("class", "map-bubbles")
        .selectAll("circle")
        .data(finalGeoData.features)
        .enter()
        .append("circle")
        .attr("cx", d => getLabelPoint(d)[0])
        .attr("cy", d => getLabelPoint(d)[1])
        .attr("r", d => {
          const value = valueByCity[normalize(getFeatureName(d))];
          return value > 0 ? bubbleSizeScale(value) : 0;
        })
        .attr("fill", "#f97316")
        .attr("fill-opacity", 0.72)
        .attr("stroke", "#9a3412")
        .attr("stroke-width", 1)
        .style("display", d => {
          const [x, y] = getLabelPoint(d);
          return Number.isFinite(x) && Number.isFinite(y) ? null : "none";
        })
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
    }

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
        .attr("fill", textFill)
        .attr("paint-order", "stroke")
        .attr("stroke", labelStroke)
        .attr("stroke-width", 3)
        .attr("stroke-linejoin", "round")
        .style("font-family", "Arial, sans-serif")
        .style("filter", labelShadow)
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

        if (hideNoData && displayValueByCity[labelKey] == null) {
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
              .attr("stroke", leaderStroke)
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

} else if (mapName === "canada") {

  legendX = width - 560;
  legendY = height - 50;

} else if (mapName === "greece") {

  legendX = width - 220;
  legendY = height - 300;

} else if (mapName === "uk") {

  legendX = width - 160;
  legendY = height - 230;

}else if (mapName === "russia") {

  legendX = width - 640;
  legendY = height - 90;
}else if (mapName === "france") {

  legendX = width - 340;
  legendY = height - 60;

}else if (mapName === "india") {

  legendX = width - 160;
  legendY = height - 60;

}else if (mapName === "china") {

  legendX = width - 740;
  legendY = height - 60;
}
else {

  legendX = width - 220;
  legendY = height - 120;

}

    if (legendTitle.trim()) {
      const legendTitleText = svg.append("text")
        .attr("x", legendX)
        .attr("y", legendY - 8)
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", textFill)
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

    if (mapType === "colored-regions") {
      const legendScale = d3.scaleLinear()
        .domain(colorScale.domain())
        .range([0, legendWidth]);

      svg.append("rect")
        .attr("x", legendX)
        .attr("y", legendY)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

      const [dMin, dMax] = colorScale.domain();
      const range = dMax - dMin;
      const maxLabelLen = d3.format("~s")(dMax).length;
      const tickCount = maxLabelLen >= 6 ? 3 : maxLabelLen >= 4 ? 4 : 5;
      const tickFmt = range >= 10000 || dMax >= 10000
        ? d3.format("~s")
        : d3.format("~g");

      const axisG = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
        .call(d3.axisBottom(legendScale).ticks(tickCount).tickFormat(tickFmt));
      axisG.selectAll("text").attr("fill", textFill);
      axisG.selectAll("line, path").attr("stroke", darkBackground ? "rgba(241,245,249,0.4)" : null);
    }

    if (mapType === "two-color-status") {
      const binaryLegend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`)
        .style("font-family", "Arial, sans-serif")
        .attr("font-size", 12)
        .attr("fill", textFill);

      [
        { label: "Present", color: "#2563eb" },
        { label: "Absent", color: "#dc2626" }
      ].forEach((item, index) => {
        const y = index * 22;
        binaryLegend.append("rect")
          .attr("x", 0)
          .attr("y", y)
          .attr("width", 14)
          .attr("height", 14)
          .attr("fill", item.color);

        binaryLegend.append("text")
          .attr("x", 22)
          .attr("y", y + 11)
          .text(item.label);
      });
    }

    if (mapType === "circles-by-value") {
      const bubbleLegend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`)
        .style("font-family", "Arial, sans-serif")
        .attr("font-size", 12)
        .attr("fill", textFill);

      const legendValues = [Math.round(maxValue / 2), maxValue]
        .filter((value, index, values) => value > 0 && values.indexOf(value) === index);

      legendValues.forEach((value, index) => {
        const x = index * 72 + 16;
        const radius = bubbleSizeScale(value);

        bubbleLegend.append("circle")
          .attr("cx", x)
          .attr("cy", 28 - radius)
          .attr("r", radius)
          .attr("fill", "#f97316")
          .attr("fill-opacity", 0.72)
          .attr("stroke", "#9a3412");

        bubbleLegend.append("text")
          .attr("x", x)
          .attr("y", 46)
          .attr("text-anchor", "middle")
          .text(value);
      });
    }

  }, [data, theme, geoData, mapName, showPlaceNames, showPlaceValues, mapTitle, legendTitle, mapType, darkBackground, gradientMin, gradientMax, hideNoData]);

  return <svg ref={ref}></svg>;
}
