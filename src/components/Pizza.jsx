import React from "react";
import useSocket from "@/stores/socket";
import * as d3 from "d3";
import { formatRgb } from "culori";

// based on 
// https://wattenberger.com/blog/react-and-d3
// https://d3-graph-gallery.com/graph/pie_annotation.html

const width = 1000,
  height = 1000,
  margin = 40;
const radius = Math.min(width, height) / 2 - margin;
const arcGenerator = d3.arc().innerRadius(0).outerRadius(radius);
const labelRadius = 0 * 0.2 + radius * 0.8;
const arcGeneratorLabel = d3.arc().innerRadius(labelRadius).outerRadius(labelRadius);

export default function Pizza() {
  const users = useSocket((state) => state.users);
  const slices = d3.pie().value(() => users.length)(users);

  return (
    <div style={{ alignItems: "center", justifyContent: "center" }}>
      <svg width={width} height={height}>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {slices.map((d, index) => {
            return (
              <>
                <path
                  d={arcGenerator(d)}
                  fill={formatRgb(d.data.color)}
                  stroke="black"
                  strokeWidth="2px"
                  opacity="0.7"
                />
                <text
                  transform={`translate(${arcGeneratorLabel.centroid(d)})`}
                  textAnchor="middle"
                  fontSize={17}
                >
                  {d.data.socketId || index}
                </text>
              </>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
