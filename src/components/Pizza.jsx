import React from "react";
import useSocket from "@/stores/socket";
import * as d3 from "d3";
import { formatRgb } from "culori";
import { makeDraggable } from "./utils";

// based on
// https://wattenberger.com/blog/react-and-d3
// https://d3-graph-gallery.com/graph/pie_annotation.html
// https://dev.to/taowen/make-react-svg-component-draggable-2kc

function PizzaSlice({ children, data: { userId } }) {
  const setUsers = useSocket((state) => state.setUsers);
  const users = useSocket((state) => state.users);

  const ref = React.useRef();
  React.useEffect(() => {
    const curr = ref.current;
    makeDraggable(curr, (swapWith) => {
      const swapIndex = users.findIndex((user) => user.userId === swapWith.id);
      const sliceIndex = users.findIndex((user) => user.userId === userId);
      const newUsers = [...users];
      const b = newUsers[swapIndex];
      newUsers[swapIndex] = newUsers[sliceIndex];
      newUsers[sliceIndex] = b;
      setUsers(newUsers);
    });
    return () => {
      d3.select(window).on(".drag", null);
      d3.select(curr).on("mousedown.drag", null);
    };
  }, [users, setUsers, userId]);
  return (
    <g ref={ref} id={userId}>
      {children}
    </g>
  );
}

function startAngle(d) {
  // d.startAngle + Math.PI puts the first arc's __start__ at 6 O'Clock
  // divide by d.data.length * (d.data.length - 1) puts the first arc's __center__ at 6 O'Clock
  return d.startAngle + (Math.PI / d.data.length) * (d.data.length - 1);
}
function endAngle(d) {
  return d.endAngle + (Math.PI / d.data.length) * (d.data.length - 1);
}

const width = 500,
  height = width;
const originX = 250;
const originY = 250;
const innerCircleRadius = 100;
const outerCircleRadius = 150;

const arcGenerator = d3
  .arc()
  .innerRadius(outerCircleRadius)
  .outerRadius(outerCircleRadius)
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
        <circle
          cx={originX}
          cy={originY}
          r={innerCircleRadius}
          fill={"white"}
          stroke={"black"}
        />
        <circle
          cx={originX}
          cy={originY}
          r={outerCircleRadius}
          fill={"none"}
          stroke={"black"}
        />
        <g>
          {slices.map((d, index) => {
            let type = d.data.isSessionSupported
              ? "XR"
              : d.data.socketId
              ? "inline"
              : "fake";
            const chairOriginX = originX + outerCircleRadius * Math.sin(0);
            const chairOriginY = originY - outerCircleRadius * Math.cos(0);
            const chairWidth = 50;
            return (
              <PizzaSlice key={d.data.userId} data={d.data}>
                <rect
                  x={chairOriginX - chairWidth / 2}
                  y={chairOriginY - chairWidth / 2}
                  transform={`rotate(${
                    180 + index * (360 / users.length)
                  }, ${originX}, ${originY})`}
                  width={chairWidth}
                  height={chairWidth}
                  fill={formatRgb(d.data.color)}
                  stroke="black"
                  strokeWidth="2px"
                  opacity="0.7"
                />
                <g
                  transform={`translate(${width / 2}, ${height / 2})`}
                  style={{ pointerEvents: "none" }}
                >
                  <text
                    transform={`translate(${arcGenerator.centroid(d)})`}
                    textAnchor="middle"
                    fontSize={12}
                    stroke="white"
                    strokeWidth="1"
                    paintOrder="stroke"
                  >
                    <tspan fontSize={20}>{type}</tspan>
                    <tspan x="0" dy="1.2em">
                      (id: {d.data.userId})
                    </tspan>
                  </text>
                </g>
              </PizzaSlice>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
