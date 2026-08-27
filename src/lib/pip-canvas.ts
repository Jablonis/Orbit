/**
 * Pip on canvas.
 *
 * The same shapes the interface draws as SVG, put on the shared images so a
 * posted card carries the character rather than only the numbers. The palette
 * is passed in because the cards are dark and the app is paper: a black
 * penguin on a near-black card is a hole in the image.
 */

import type { PipMood } from "@/lib/mascot";
import {
  PIP_HEIGHT,
  PIP_WIDTH,
  type PipColor,
  type PipShape,
  getPipArt,
} from "@/lib/pip-art";
import { PIXEL } from "@/lib/pip-pixels";

export type PipPalette = Record<PipColor, string>;

/** Pip on a dark share image: the shell lifts off the ground it sits on. */
export const darkPipPalette: PipPalette = {
  beak: "#E8A33D",
  flame: "#F0568C",
  ink: "#2B2634",
  paper: "#F4F1F7",
  plum: "#8A5CF0",
};

/**
 * Draws Pip with the top-left of the character box at (x, y), scaled so the
 * character stands `height` pixels tall.
 */
export function drawPip(
  context: CanvasRenderingContext2D,
  {
    burn = 0.6,
    height,
    mood,
    palette = darkPipPalette,
    x,
    y,
  }: {
    burn?: number;
    height: number;
    mood: PipMood;
    palette?: PipPalette;
    x: number;
    y: number;
  },
) {
  const art = getPipArt(mood, burn);
  // Snap the scale so one cell of the grid is a whole number of canvas pixels.
  // At a fractional scale the runs meet on a half pixel and antialiasing draws
  // a pale seam between every one of them, which on a shared image reads as a
  // torn drawing rather than as pixel art.
  const cell = Math.max(1, Math.round((height / PIP_HEIGHT) * PIXEL));
  const scale = cell / PIXEL;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  art.shapes.forEach((shape) => paint(context, shape, palette));

  context.restore();
}

/** How wide Pip is at a given height, for laying a card out around it. */
export function pipWidth(height: number) {
  return (height * PIP_WIDTH) / PIP_HEIGHT;
}

function paint(
  context: CanvasRenderingContext2D,
  shape: PipShape,
  palette: PipPalette,
) {
  context.save();
  context.globalAlpha = shape.opacity ?? 1;

  if (shape.rotate) {
    context.translate(shape.rotate.x, shape.rotate.y);
    context.rotate((shape.rotate.deg * Math.PI) / 180);
    context.translate(-shape.rotate.x, -shape.rotate.y);
  }

  context.beginPath();
  if (shape.kind === "path") {
    // Path2D takes the same data the SVG renderer hands to a <path>. Pip is
    // drawn from a grid now, so nothing reaches this branch; it stays for the
    // marks and badges the cards draw through the same painter.
    if (typeof Path2D === "undefined") {
      context.restore();
      return;
    }
    context.lineCap = shape.cap === "round" ? "round" : "butt";
    const path = new Path2D(shape.d);
    if (shape.fill) {
      context.fillStyle = palette[shape.fill];
      context.fill(path);
    }
    if (shape.stroke) {
      context.strokeStyle = palette[shape.stroke];
      context.lineWidth = shape.width ?? 1;
      context.stroke(path);
    }
    context.restore();
    return;
  }

  if (shape.kind === "circle") {
    context.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
  } else if (shape.kind === "ellipse") {
    context.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
  } else {
    roundedRect(context, shape.x, shape.y, shape.width, shape.height, shape.radius);
  }

  if (shape.fill) {
    context.fillStyle = palette[shape.fill];
    context.fill();
  }
  if (shape.stroke) {
    context.strokeStyle = palette[shape.stroke];
    context.lineWidth = shape.width ?? 1;
    context.stroke();
  }

  context.restore();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}
