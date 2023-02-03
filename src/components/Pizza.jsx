import React from "react";
import useSocket from "@/stores/socket";

export default function Pizza() {
  const users = useSocket((state) => state.users);

  const slices = users.map((_, index) => {
    return {
      percentage: 1 / users.length,
      color: index % 2 ? "blue" : "red",
    };
  });

  let totalPercentage = 0;

  const getCoordinatesForPercent = () => {
    const x = Math.cos(2 * Math.PI * totalPercentage);
    const y = Math.sin(2 * Math.PI * totalPercentage);
    return [x, y];
  };

  const _renderSlice = ({ percentage, color }) => {
    const [startX, startY] = getCoordinatesForPercent();
    totalPercentage += percentage;
    const [endX, endY] = getCoordinatesForPercent();

    const largeArcFlag = percentage > 0.5 ? 1 : 0;
    const pathData = [
      `M ${startX} ${startY}`, // Move
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, // Arc
      "L 0 0", // Line
    ].join(" ");

    return <path d={pathData} fill={color} key={pathData} />;
  };

  return (
    <div style={{ alignItems: "center", justifyContent: "center" }}>
      <svg
        height="100"
        width="100"
        viewBox="-1 -1 2 2"
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        {slices.map((slice) => _renderSlice(slice))}
      </svg>
    </div>
  );
}
