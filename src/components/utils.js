import * as d3 from "d3";
import { drag } from "d3-drag";

export function makeDraggable(element, callback) {
  let translateX = 0;
  let translateY = 0;
  const handleDrag = drag()
    .subject(() => {
      return { x: translateX, y: translateY };
    })
    .on("drag", (dragEvent) => {
      const me = d3.select(element);
      const transform = `translate(${dragEvent.x}, ${dragEvent.y})`;
      translateX = dragEvent.x;
      translateY = dragEvent.y;
      me.attr("transform", transform);
      let currBb;
      const bbs = Array.from(element.parentElement.children).map((g) => {
        const domRect = g.getBoundingClientRect();
        const bb = {
          width: domRect.width,
          height: domRect.height,
          area: domRect.width * domRect.height,
          left: domRect.x,
          top: domRect.y,
          right: domRect.x + domRect.width,
          bottom: domRect.y + domRect.height,
          lt: { x: domRect.x, y: domRect.y },
          rb: { x: domRect.x + domRect.width, y: domRect.y + domRect.height },
          rt: { x: domRect.x + domRect.width, y: domRect.y },
          lb: { x: domRect.x, y: domRect.y + domRect.height },
          id: g.id,
        };
        if (bb.id === element.id) {
          currBb = bb;
        }

        return bb;
      });
      const bbOverlaps = bbs.filter((bb) => {
        if (bb.id === currBb.id) {
          return false;
        } else if (currBb.lt.x > bb.rb.x || bb.lt.x > currBb.rb.x) {
          return false;
        } else if (currBb.rb.y < bb.lt.y || bb.rb.y < currBb.lt.y) {
          return false;
        } else {
          return true;
        }
      });
      const bbOverlapsPerc = bbOverlaps.reduce((prev, bb) => {
        const areaOverlap =
          (Math.max(currBb.left, bb.left) - Math.min(currBb.right, bb.right)) *
          (Math.max(currBb.top, bb.top) - Math.min(currBb.bottom, bb.bottom));
        const areaOverlapPerc =
          areaOverlap / (currBb.area + bb.area - areaOverlap);
        if (!prev?.areaOverlapPerc || areaOverlapPerc > prev.areaOverlapPerc) {
          return { id: bb.id, areaOverlapPerc };
        } else {
          return prev;
        }
      }, null);
      if (bbOverlapsPerc?.areaOverlapPerc > 0.6) {
        const transform = `translate(${0}, ${0})`;
        translateX = 0;
        translateY = 0;
        me.attr("transform", transform);
        callback(bbOverlapsPerc);
      }
    })
    .on("end", () => {
      const me = d3.select(element);
      const transform = `translate(${0}, ${0})`;
      translateX = 0;
      translateY = 0;
      me.attr("transform", transform);
    });
  handleDrag(d3.select(element));
}
