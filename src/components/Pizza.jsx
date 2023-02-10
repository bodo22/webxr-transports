import React from "react";
import useSocket from "@/stores/socket";
import * as d3 from "d3";
import { formatRgb } from "culori";

// based on
// https://wattenberger.com/blog/react-and-d3
// https://d3-graph-gallery.com/graph/pie_annotation.html

function startAngle(d) {
  // d.startAngle + Math.PI makes the first arc's start at 6 O'Clock
  // / d.data.length * (d.data.length - 1) puts the first arc's center at 6 O'Clock
  return d.startAngle + (Math.PI / d.data.length) * (d.data.length - 1);
}
function endAngle(d) {
  return d.endAngle + (Math.PI / d.data.length) * (d.data.length - 1);
}

const width = 500,
  height = width,
  margin = 40;
const radius = Math.min(width, height) / 2 - margin;
const arcGenerator = d3
  .arc()
  .innerRadius(width / 8)
  .outerRadius(radius)
  .startAngle(startAngle)
  .endAngle(endAngle);

export default function Pizza() {
  const users = useSocket((state) => state.users);
  const slices = d3.pie().value(() => users.length)(
    users.map((user) => ({ ...user, length: users.length }))
  );

  return (
    <div style={{ alignItems: "center", justifyContent: "center" }}>
      <svg width={width} height={height}>
        <g transform={`translate(${width / 2}, ${height / 2})`}>
          {slices.map((d) => {
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
                  transform={`translate(${arcGenerator.centroid(d)})`}
                  textAnchor="middle"
                  fontSize={12}
                >
                  {d.data.userId}
                </text>
              </>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
