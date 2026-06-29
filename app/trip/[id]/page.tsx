"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResultCard, { getTripExportData } from "@/components/ResultCard";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  user_id: string;
  destination: string;
  days: string | number;
  budget: string | number;
  result: unknown;
  favorite: boolean | null;
  public: boolean | null;
  created_at: string;
};

type TripExportData = ReturnType<typeof getTripExportData>;
type PdfDocument = InstanceType<typeof import("jspdf").jsPDF>;
const TICKET_WIDTH = 1400;
const TICKET_HEIGHT = 760;

function formatCreatedDate(date?: string) {
  if (!date) return "Recently";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatBudget(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "Flexible";
  }

  return String(value);
}

function getTicketCurrency(destination: string) {
  const text = destination.toLowerCase();

  if (/(japan|tokyo|osaka|kyoto|sapporo|okinawa)/i.test(text)) return "JPY";
  if (/(paris|france|rome|italy|spain|barcelona|madrid|germany|berlin|europe)/i.test(text)) return "EUR";
  if (/(london|uk|united kingdom|england|scotland)/i.test(text)) return "GBP";
  if (/(canada|toronto|vancouver|montreal)/i.test(text)) return "CAD";
  if (/(australia|sydney|melbourne)/i.test(text)) return "AUD";

  return "USD";
}

function formatTicketBudget(
  value: string | number | null | undefined,
  destination: string
) {
  const currency = getTicketCurrency(destination);
  const fallback = `${currency} Flexible`;

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const rawValue = String(value).trim();

  if (!rawValue) {
    return fallback;
  }

  if (/^[A-Z]{3}\s/i.test(rawValue)) {
    return rawValue;
  }

  const numericValue = Number(rawValue.replace(/[^0-9.-]/g, ""));

  if (Number.isFinite(numericValue) && rawValue.match(/\d/)) {
    return `${currency} ${Math.round(numericValue).toLocaleString("en-US")}`;
  }

  return `${currency} ${rawValue}`;
}

function getTicketStampLabel(destination: string) {
  const text = destination.toLowerCase();
  const knownLabels: Array<[RegExp, string]> = [
    [/universal|osaka/, "OSAKA"],
    [/tokyo/, "TOKYO"],
    [/kyoto/, "KYOTO"],
    [/paris/, "PARIS"],
    [/new york|nyc/, "NEW YORK"],
    [/london/, "LONDON"],
    [/rome/, "ROME"],
    [/seoul/, "SEOUL"],
    [/singapore/, "SINGAPORE"],
  ];

  const match = knownLabels.find(([pattern]) => pattern.test(text));

  if (match) {
    return match[1];
  }

  return destination
    .split(/[\s,/-]+/)
    .find((part) => part.length > 2)
    ?.slice(0, 10)
    .toUpperCase() || "TRIP";
}

function getTicketStampParts(destination: string) {
  const text = destination.toLowerCase();
  const location = getTicketStampLabel(destination);

  if (/(japan|tokyo|osaka|kyoto|sapporo|okinawa|universal)/i.test(text)) {
    return { location, country: "JAPAN · JP" };
  }

  if (/(paris|france)/i.test(text)) return { location, country: "FRANCE · FR" };
  if (/(london|uk|united kingdom|england|scotland)/i.test(text)) {
    return { location, country: "UNITED KINGDOM · GB" };
  }
  if (/(new york|nyc|usa|united states)/i.test(text)) {
    return { location, country: "UNITED STATES · US" };
  }
  if (/(rome|italy)/i.test(text)) return { location, country: "ITALY · IT" };
  if (/(seoul|korea)/i.test(text)) return { location, country: "KOREA · KR" };
  if (/singapore/i.test(text)) return { location, country: "SINGAPORE · SG" };

  return { location, country: "TRAVEL PASS · TM" };
}

function downloadBlob(blob: Blob, fileName: string) {
  const imageUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = imageUrl;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(imageUrl);
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const displayLine =
      index === maxLines - 1 && lines.length > maxLines
        ? `${line.replace(/[.,;:!?]+$/, "")}...`
        : line;

    context.fillText(displayLine, x, y + index * lineHeight);
  });
}

function getCanvasTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, maxLines).map((line, index) =>
    index === maxLines - 1 && lines.length > maxLines
      ? `${line.replace(/[.,;:!?]+$/, "")}...`
      : line
  );
}

function drawFittedCanvasText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxLines: number,
  maxFontSize: number,
  minFontSize: number,
  weight = 900
) {
  let fontSize = maxFontSize;
  let lines: string[] = [];

  while (fontSize >= minFontSize) {
    context.font = `${weight} ${fontSize}px Arial, Helvetica, sans-serif`;
    lines = getCanvasTextLines(context, text, maxWidth, maxLines);

    if (
      lines.length <= maxLines &&
      lines.every((line) => context.measureText(line).width <= maxWidth)
    ) {
      break;
    }

    fontSize -= 4;
  }

  const lineHeight = Math.round(fontSize * 1.05);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function waitForPdfRender(delay = 220) {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, delay);
      });
    });
  });
}

async function waitForExportAssets(element: HTMLElement) {
  await waitForPdfRender();

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const images = Array.from(
    element.querySelectorAll<HTMLImageElement>("img")
  );

  await Promise.all(
    images.map(async (image: HTMLImageElement) => {
      if (image.complete) return;

      const decodeImage =
        typeof image.decode === "function" ? image.decode.bind(image) : null;

      if (decodeImage) {
        await decodeImage().catch(() => undefined);
        return;
      }

      await new Promise<void>((resolve) => {
        image.onload = () => resolve();
        image.onerror = () => resolve();
      });
    })
  );
}

function getExportElementSize(element: HTMLElement) {
  return {
    height: element.scrollHeight || element.offsetHeight,
    width: element.scrollWidth || element.offsetWidth,
  };
}

function isEmptyCanvas(canvas: HTMLCanvasElement) {
  return !canvas.width || !canvas.height;
}

function applyCanvasSafePalette(clonedRoot: HTMLElement) {
  const clonedElements = [
    clonedRoot,
    ...Array.from(clonedRoot.querySelectorAll<HTMLElement>("*")),
  ];

  clonedElements.forEach((clonedElement) => {
    const classes = clonedElement.classList;

    clonedElement.style.boxShadow = "none";

    if (classes.contains("bg-white")) clonedElement.style.backgroundColor = "#ffffff";
    if (classes.contains("bg-gray-950")) clonedElement.style.backgroundColor = "#030712";
    if (classes.contains("bg-gray-50")) clonedElement.style.backgroundColor = "#f9fafb";
    if (classes.contains("bg-gray-100")) clonedElement.style.backgroundColor = "#f3f4f6";
    if (classes.contains("bg-amber-50")) clonedElement.style.backgroundColor = "#fffbeb";
    if (classes.contains("bg-white/10")) clonedElement.style.backgroundColor = "rgba(255, 255, 255, 0.1)";

    if (classes.contains("border-gray-200")) clonedElement.style.borderColor = "#e5e7eb";
    if (classes.contains("border-gray-100")) clonedElement.style.borderColor = "#f3f4f6";

    if (classes.contains("text-white")) clonedElement.style.color = "#ffffff";
    if (classes.contains("text-white/70")) clonedElement.style.color = "rgba(255, 255, 255, 0.7)";
    if (classes.contains("text-white/55")) clonedElement.style.color = "rgba(255, 255, 255, 0.55)";
    if (classes.contains("text-white/50")) clonedElement.style.color = "rgba(255, 255, 255, 0.5)";
    if (classes.contains("text-gray-950")) clonedElement.style.color = "#030712";
    if (classes.contains("text-gray-700")) clonedElement.style.color = "#374151";
    if (classes.contains("text-gray-600")) clonedElement.style.color = "#4b5563";
    if (classes.contains("text-gray-500")) clonedElement.style.color = "#6b7280";
    if (classes.contains("text-amber-800")) clonedElement.style.color = "#92400e";
  });
}

function getTripPdfFileName(trip: Trip) {
  const fileName = `${trip.destination || "tripmuse"}-itinerary.pdf`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
}

function getTripTicketFileName(trip: Trip) {
  const fileName = `${trip.destination || "tripmuse"}-ticket.png`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return fileName.endsWith(".png") ? fileName : `${fileName}.png`;
}

function drawTicketField(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  context.fillStyle = "#6b7280";
  context.font = "700 22px Arial, Helvetica, sans-serif";
  context.fillText(label.toUpperCase(), x, y);

  context.fillStyle = "#030712";
  context.font = "800 34px Arial, Helvetica, sans-serif";
  wrapCanvasText(context, value, x, y + 52, width, 38, 1);
}

function drawTicketBarcode(
  context: CanvasRenderingContext2D,
  code: string,
  startX: number,
  baselineY: number
) {
  let x = startX;

  context.fillStyle = "#030712";
  code.split("").forEach((char, index) => {
    if (char === "-") {
      x += 8;
      return;
    }

    const width = 4 + ((char.charCodeAt(0) + index) % 5) * 3;
    const height = 92 + ((char.charCodeAt(0) + index) % 4) * 12;

    context.fillRect(x, baselineY - height, width, height);
    x += width + 7;
  });
}

function drawArcText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  mode: "top" | "bottom"
) {
  const chars = text.split("");
  const total = Math.max(chars.length - 1, 1);

  chars.forEach((char, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / total;
    const radians = (angle * Math.PI) / 180;
    const x = centerX + Math.cos(radians) * radius;
    const y = centerY + Math.sin(radians) * radius;

    context.save();
    context.translate(x, y);
    context.rotate(((mode === "top" ? angle + 90 : angle - 90) * Math.PI) / 180);
    context.fillText(char, 0, 0);
    context.restore();
  });
}

function drawDestinationStamp(
  context: CanvasRenderingContext2D,
  destination: string,
  centerX: number,
  centerY: number
) {
  const accentColor = "#d92d25";

  context.save();
  context.strokeStyle = accentColor;
  context.fillStyle = accentColor;
  context.lineWidth = 3;

  const stampParts = getTicketStampParts(destination);
  const topArcSpan = Math.min(96, Math.max(56, stampParts.location.length * 9));
  const bottomArcSpan = Math.min(130, Math.max(86, stampParts.country.length * 7));

  [132, 118, 78].forEach((radius, index) => {
    context.lineWidth = index === 0 ? 3 : 2;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();
  });

  context.lineWidth = 2;
  [...Array(4)].forEach((_, groupIndex) => {
    const start = [25, 120, 205, 300][groupIndex];

    for (let angle = start; angle <= start + 36; angle += 12) {
      const radians = (angle * Math.PI) / 180;
      context.beginPath();
      context.moveTo(
        centerX + Math.cos(radians) * 104,
        centerY + Math.sin(radians) * 104
      );
      context.lineTo(
        centerX + Math.cos(radians) * 116,
        centerY + Math.sin(radians) * 116
      );
      context.stroke();
    }
  });

  context.font = "800 25px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  drawArcText(
    context,
    stampParts.location,
    centerX,
    centerY,
    104,
    270 - topArcSpan / 2,
    270 + topArcSpan / 2,
    "top"
  );

  context.font = "800 18px Arial, Helvetica, sans-serif";
  drawArcText(
    context,
    stampParts.country,
    centerX,
    centerY,
    104,
    90 + bottomArcSpan / 2,
    90 - bottomArcSpan / 2,
    "bottom"
  );

  context.font = "800 22px Arial, Helvetica, sans-serif";
  context.fillText("JOURNEY", centerX, centerY + 78);

  [-36, 36].forEach((offsetX) => {
    context.beginPath();
    context.moveTo(centerX + offsetX, centerY - 72);
    context.lineTo(centerX + offsetX + 5, centerY - 60);
    context.lineTo(centerX + offsetX + 18, centerY - 56);
    context.lineTo(centerX + offsetX + 5, centerY - 52);
    context.lineTo(centerX + offsetX, centerY - 40);
    context.lineTo(centerX + offsetX - 5, centerY - 52);
    context.lineTo(centerX + offsetX - 18, centerY - 56);
    context.lineTo(centerX + offsetX - 5, centerY - 60);
    context.closePath();
    context.stroke();
  });

  context.lineWidth = 3;
  context.strokeRect(centerX - 42, centerY + 2, 84, 46);
  context.beginPath();
  context.arc(centerX, centerY + 2, 42, Math.PI, Math.PI * 2);
  context.stroke();

  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(centerX - 24, centerY + 48);
  context.lineTo(centerX - 24, centerY + 18);
  context.moveTo(centerX + 24, centerY + 48);
  context.lineTo(centerX + 24, centerY + 18);
  context.stroke();

  context.lineWidth = 3;
  context.beginPath();
  context.arc(centerX, centerY - 38, 30, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(centerX - 30, centerY - 38);
  context.lineTo(centerX + 30, centerY - 38);
  context.moveTo(centerX, centerY - 68);
  context.quadraticCurveTo(centerX - 16, centerY - 38, centerX, centerY - 8);
  context.moveTo(centerX, centerY - 68);
  context.quadraticCurveTo(centerX + 16, centerY - 38, centerX, centerY - 8);
  context.stroke();

  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(centerX - 98, centerY + 58);
  context.bezierCurveTo(
    centerX - 62,
    centerY + 10,
    centerX - 24,
    centerY + 78,
    centerX + 16,
    centerY + 28
  );
  context.bezierCurveTo(
    centerX + 40,
    centerY - 2,
    centerX + 70,
    centerY - 2,
    centerX + 96,
    centerY + 34
  );
  context.stroke();

  context.beginPath();
  context.moveTo(centerX - 88, centerY + 58);
  context.lineTo(centerX - 80, centerY + 38);
  context.moveTo(centerX - 58, centerY + 30);
  context.lineTo(centerX - 49, centerY + 54);
  context.moveTo(centerX + 74, centerY + 16);
  context.lineTo(centerX + 65, centerY + 46);
  context.stroke();

  for (let index = 0; index < 4; index += 1) {
    context.beginPath();
    const y = centerY + 68 + index * 21;

    for (let t = 0; t < 190; t += 4) {
      const x = centerX - 232 + t;
      const waveY = y + Math.sin(t / 18) * 8;

      if (t === 0) {
        context.moveTo(x, waveY);
      } else {
        context.lineTo(x, waveY);
      }
    }

    context.stroke();
  }

  context.restore();
}

function createTicketCode(trip: Trip) {
  return `TM-${trip.id.slice(0, 4).toUpperCase()}-${trip.id
    .slice(-4)
    .toUpperCase()}`;
}

async function createTripTicketImage(trip: Trip, exportData: TripExportData) {
  const canvas = document.createElement("canvas");
  canvas.width = TICKET_WIDTH;
  canvas.height = TICKET_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  const destination = exportData.destination || trip.destination || "Your Trip";
  const title = exportData.title || "A personalized AI itinerary by TripMuse.";
  const highlights =
    exportData.highlights.length > 0
      ? exportData.highlights.slice(0, 3)
      : ["AI itinerary", "Travel tips", "Budget guidance"];
  const ticketCode = createTicketCode(trip);

  context.fillStyle = "#f3f4f6";
  context.fillRect(0, 0, TICKET_WIDTH, TICKET_HEIGHT);

  context.fillStyle = "#ffffff";
  context.fillRect(52, 58, TICKET_WIDTH - 104, TICKET_HEIGHT - 116);

  context.strokeStyle = "#d1d5db";
  context.lineWidth = 3;
  context.strokeRect(52, 58, TICKET_WIDTH - 104, TICKET_HEIGHT - 116);

  context.fillStyle = "#030712";
  context.fillRect(52, 58, TICKET_WIDTH - 104, 104);

  context.fillStyle = "#ffffff";
  context.font = "900 34px Arial, Helvetica, sans-serif";
  context.fillText("TRIPMUSE TICKET", 94, 123);

  context.fillStyle = "rgba(255, 255, 255, 0.68)";
  context.font = "700 20px Arial, Helvetica, sans-serif";
  context.fillText("AI TRAVEL PASS", 1030, 122);

  context.strokeStyle = "#d1d5db";
  context.lineWidth = 2;
  context.setLineDash([14, 14]);
  context.beginPath();
  context.moveTo(972, 162);
  context.lineTo(972, 702);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "#030712";
  drawFittedCanvasText(context, destination, 106, 292, 560, 2, 78, 50);

  context.save();
  context.translate(830, 350);
  context.scale(0.78, 0.78);
  drawDestinationStamp(context, destination, 0, 0);
  context.restore();

  context.fillStyle = "#d92d25";
  context.beginPath();
  context.arc(106, 500, 7, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#cfd4dc";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(140, 500);
  context.lineTo(676, 500);
  context.stroke();

  context.fillStyle = "#4b5563";
  context.font = "400 32px Arial, Helvetica, sans-serif";
  wrapCanvasText(context, title, 110, 560, 760, 38, 1);

  drawTicketField(
    context,
    "Duration",
    `${trip.days} days`,
    110,
    620,
    190
  );
  drawTicketField(
    context,
    "Budget",
    formatTicketBudget(trip.budget, destination),
    325,
    620,
    250
  );
  drawTicketField(
    context,
    "Issued",
    formatCreatedDate(trip.created_at),
    620,
    620,
    310
  );

  context.fillStyle = "#6b7280";
  context.font = "700 20px Arial, Helvetica, sans-serif";
  context.fillText("HIGHLIGHTS", 1030, 218);

  context.fillStyle = "#030712";
  context.font = "700 22px Arial, Helvetica, sans-serif";
  highlights.forEach((highlight, index) => {
    wrapCanvasText(context, `- ${highlight}`, 1030, 264 + index * 70, 280, 28, 2);
  });

  drawTicketBarcode(context, ticketCode, 1030, 560);

  context.fillStyle = "#030712";
  context.font = "800 31px Arial, Helvetica, sans-serif";
  context.fillText(ticketCode, 1030, 660);

  context.fillStyle = "#6b7280";
  context.font = "400 22px Arial, Helvetica, sans-serif";
  context.fillText("TRIP PASS ID", 1030, 616);
  context.fillText("Made with TripMuse", 1030, 692);

  context.fillStyle = "#f3f4f6";
  context.beginPath();
  context.arc(972, 58, 30, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(972, 702, 30, 0, Math.PI * 2);
  context.fill();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create ticket image."));
      }
    }, "image/png");
  });
}

function ensurePdfPageSpace(
  pdf: PdfDocument,
  y: number,
  pageHeight: number,
  margin: number,
  neededSpace = 24
) {
  if (y + neededSpace <= pageHeight - margin) {
    return y;
  }

  pdf.addPage();
  return margin;
}

function addWrappedPdfText(
  pdf: PdfDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  pageHeight: number,
  margin: number,
  lineHeight = 15
) {
  const lines = pdf.splitTextToSize(text || "Not provided.", maxWidth) as string[];
  let nextY = y;

  lines.forEach((line) => {
    nextY = ensurePdfPageSpace(pdf, nextY, pageHeight, margin, lineHeight);
    pdf.text(line, x, nextY);
    nextY += lineHeight;
  });

  return nextY;
}

function addFallbackPdfSection(
  pdf: PdfDocument,
  title: string,
  y: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  const nextY = ensurePdfPageSpace(pdf, y, pageHeight, margin, 34);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(3, 7, 18);
  pdf.text(title, margin, nextY);

  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, nextY + 8, pageWidth - margin, nextY + 8);

  return nextY + 28;
}

function setFallbackPdfBodyStyle(pdf: PdfDocument) {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(55, 65, 81);
}

function saveFallbackTripPdf(
  pdf: PdfDocument,
  trip: Trip,
  exportData: TripExportData
) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const textWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFillColor(3, 7, 18);
  pdf.rect(0, 0, pageWidth, 155, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(exportData.destination || trip.destination || "TripMuse", margin, y + 14);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(209, 213, 219);
  y = addWrappedPdfText(
    pdf,
    exportData.title,
    margin,
    y + 42,
    textWidth,
    pageHeight,
    margin,
    15
  );
  pdf.text(`Duration: ${trip.days} days`, margin, 122);
  pdf.text(`Budget: ${formatBudget(trip.budget)}`, margin + 160, 122);
  pdf.text(`Created: ${formatCreatedDate(trip.created_at)}`, margin + 320, 122);

  y = 190;
  y = addFallbackPdfSection(pdf, "Day-by-Day Itinerary", y, pageWidth, pageHeight, margin);
  setFallbackPdfBodyStyle(pdf);

  if (exportData.days.length > 0) {
    exportData.days.forEach((day) => {
      y = ensurePdfPageSpace(pdf, y, pageHeight, margin, 70);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(3, 7, 18);
      pdf.text(day.title, margin, y);
      y += 20;

      setFallbackPdfBodyStyle(pdf);
      y = addWrappedPdfText(pdf, `Morning: ${day.morning}`, margin, y, textWidth, pageHeight, margin);
      y = addWrappedPdfText(pdf, `Afternoon: ${day.afternoon}`, margin, y, textWidth, pageHeight, margin);
      y = addWrappedPdfText(pdf, `Evening: ${day.evening}`, margin, y, textWidth, pageHeight, margin);
      y = addWrappedPdfText(pdf, `Tip: ${day.tip}`, margin, y, textWidth, pageHeight, margin);
      y += 10;
    });
  } else {
    y = addWrappedPdfText(pdf, "No daily itinerary provided.", margin, y, textWidth, pageHeight, margin);
  }

  y = addFallbackPdfSection(pdf, "Highlights", y + 8, pageWidth, pageHeight, margin);
  setFallbackPdfBodyStyle(pdf);
  (exportData.highlights.length ? exportData.highlights : ["No highlights provided."]).forEach((item) => {
    y = addWrappedPdfText(pdf, `- ${item}`, margin, y, textWidth, pageHeight, margin);
  });

  y = addFallbackPdfSection(pdf, "Food", y + 8, pageWidth, pageHeight, margin);
  setFallbackPdfBodyStyle(pdf);
  (exportData.food.length ? exportData.food : ["No food recommendations provided."]).forEach((item) => {
    y = addWrappedPdfText(pdf, `- ${item}`, margin, y, textWidth, pageHeight, margin);
  });

  y = addFallbackPdfSection(pdf, "Travel Tips", y + 8, pageWidth, pageHeight, margin);
  setFallbackPdfBodyStyle(pdf);
  (exportData.tips.length ? exportData.tips : ["No travel tips provided."]).forEach((item) => {
    y = addWrappedPdfText(pdf, `- ${item}`, margin, y, textWidth, pageHeight, margin);
  });

  y = addFallbackPdfSection(pdf, "Budget", y + 8, pageWidth, pageHeight, margin);
  setFallbackPdfBodyStyle(pdf);
  Object.entries(exportData.budget).forEach(([key, value]) => {
    y = addWrappedPdfText(
      pdf,
      `${key}: ${value || "Not provided."}`,
      margin,
      y,
      textWidth,
      pageHeight,
      margin
    );
  });
}

function PdfSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold text-gray-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TripPdfDocument({
  trip,
  exportData,
}: {
  trip: Trip;
  exportData: TripExportData;
}) {
  const budgetEntries = Object.entries(exportData.budget);

  return (
    <div className="w-[794px] bg-white p-10 text-gray-950">
      <section className="rounded-2xl bg-gray-950 p-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
          TripMuse AI Travel Plan
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight">
          {exportData.destination}
        </h1>

        <p className="mt-4 max-w-[620px] text-sm leading-7 text-white/70">
          {exportData.title}
        </p>

        <div className="mt-7 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs text-white/50">Duration</p>
            <p className="mt-1 text-lg font-bold">{trip.days} days</p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs text-white/50">Budget</p>
            <p className="mt-1 text-lg font-bold">{formatBudget(trip.budget)}</p>
          </div>

          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-xs text-white/50">Created</p>
            <p className="mt-1 text-sm font-bold">
              {formatCreatedDate(trip.created_at)}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 space-y-5">
        <PdfSection title="Trip Summary">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-gray-50 p-4">
              <dt className="font-semibold text-gray-500">Destination</dt>
              <dd className="mt-1 font-bold text-gray-950">
                {exportData.destination}
              </dd>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <dt className="font-semibold text-gray-500">Title</dt>
              <dd className="mt-1 font-bold text-gray-950">
                {exportData.title}
              </dd>
            </div>
          </dl>
        </PdfSection>

        <PdfSection title="Day-by-Day Itinerary">
          <div className="space-y-4">
            {exportData.days.length > 0 ? (
              exportData.days.map((day) => (
                <article
                  key={`${day.day}-${day.title}`}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-5"
                >
                  <h3 className="font-bold text-gray-950">{day.title}</h3>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
                    <p>
                      <span className="font-semibold text-gray-950">Morning:</span>{" "}
                      {day.morning || "Not provided."}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-950">Afternoon:</span>{" "}
                      {day.afternoon || "Not provided."}
                    </p>
                    <p>
                      <span className="font-semibold text-gray-950">Evening:</span>{" "}
                      {day.evening || "Not provided."}
                    </p>
                    <p className="rounded-lg bg-amber-50 p-3 text-amber-800">
                      <span className="font-semibold">Tip:</span>{" "}
                      {day.tip || "Not provided."}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-gray-500">No daily itinerary provided.</p>
            )}
          </div>
        </PdfSection>

        <div className="grid grid-cols-2 gap-5">
          <PdfSection title="Highlights">
            <ul className="space-y-2 text-sm leading-6 text-gray-700">
              {(exportData.highlights.length > 0
                ? exportData.highlights
                : ["No highlights provided."]
              ).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </PdfSection>

          <PdfSection title="Food">
            <ul className="space-y-2 text-sm leading-6 text-gray-700">
              {(exportData.food.length > 0
                ? exportData.food
                : ["No food recommendations provided."]
              ).map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </PdfSection>
        </div>

        <PdfSection title="Travel Tips">
          <ul className="space-y-2 text-sm leading-6 text-gray-700">
            {(exportData.tips.length > 0
              ? exportData.tips
              : ["No travel tips provided."]
            ).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </PdfSection>

        <PdfSection title="Budget">
          <div className="grid grid-cols-2 gap-3">
            {budgetEntries.map(([key, value]) => (
              <div key={key} className="rounded-xl bg-gray-50 p-4 text-sm">
                <p className="font-semibold capitalize text-gray-950">{key}</p>
                <p className="mt-1 leading-6 text-gray-600">
                  {value || "Not provided."}
                </p>
              </div>
            ))}
          </div>
        </PdfSection>
      </div>
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [user, setUser] = useState<User | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingTicket, setExportingTicket] = useState(false);
  const [updatingFavorite, setUpdatingFavorite] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let pageIsActive = true;

    const loadTrip = async () => {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!pageIsActive) return;

      if (authError) {
        console.log("Auth error:", authError);
        setLoading(false);
        return;
      }

      setUser(user);

      if (!user?.id || !id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("trip_records")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!pageIsActive) return;

      if (error) {
        console.log("Load trip error:", error);
        setTrip(null);
        setLoading(false);
        return;
      }

      setTrip(data);
      setLoading(false);
    };

    loadTrip();

    return () => {
      pageIsActive = false;
    };
  }, [id]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast("");
    }, 1800);
  };

  const toggleFavorite = async () => {
    if (!trip || !user?.id || updatingFavorite) return;

    const previousValue = Boolean(trip.favorite);
    const newValue = !previousValue;

    setUpdatingFavorite(true);
    setTrip({ ...trip, favorite: newValue });

    const { error } = await supabase
      .from("trip_records")
      .update({ favorite: newValue })
      .eq("id", trip.id)
      .eq("user_id", user.id);

    if (error) {
      console.log("Favorite update failed:", error);
      setTrip({ ...trip, favorite: previousValue });
      showToast("Favorite update failed. Please try again.");
      setUpdatingFavorite(false);
      return;
    }

    showToast(newValue ? "Trip added to favorites." : "Trip removed from favorites.");
    setUpdatingFavorite(false);
  };

  const shareTrip = async () => {
    if (!trip || !user?.id || sharing) return;

    setSharing(true);

    try {
      if (!trip.public) {
        const { error } = await supabase
          .from("trip_records")
          .update({ public: true })
          .eq("id", trip.id)
          .eq("user_id", user.id);

        if (error) throw error;

        setTrip({ ...trip, public: true });
      }

      const shareUrl = `${window.location.origin}/share/${trip.id}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Share link copied.");
      } catch {
        window.prompt("Copy this share link:", shareUrl);
        showToast("Share link ready.");
      }
    } catch (error) {
      console.log("Share failed:", error);
      showToast("Sharing failed. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const exportTicket = async () => {
    if (!trip || exportingTicket) return;

    setExportingTicket(true);

    try {
      const blob = await createTripTicketImage(trip, exportData);
      downloadBlob(blob, getTripTicketFileName(trip));
      showToast("Ticket downloaded.");
    } catch (error) {
      console.error("Ticket export failed:", error);
      showToast("Ticket export failed. Please try again.");
    } finally {
      setExportingTicket(false);
    }
  };

  const exportPdf = async () => {
    if (!trip || exportingPdf) return;

    setExportingPdf(true);

    try {
      await waitForPdfRender();

      const exportElement =
        pdfRef.current || document.getElementById("export-area");

      if (!exportElement) {
        throw new Error("PDF export failed: #export-area was not found.");
      }

      await waitForExportAssets(exportElement);

      const { height: exportHeight, width: exportWidth } =
        getExportElementSize(exportElement);
      const exportText = exportElement.textContent?.trim();

      if (!exportWidth || !exportHeight || !exportText) {
        throw new Error(
          `PDF export failed: export area is empty. width=${exportWidth} height=${exportHeight} hasText=${Boolean(
            exportText
          )}`
        );
      }

      const { jsPDF } = await import("jspdf");
      const fileName = getTripPdfFileName(trip);

      try {
        const { default: html2canvas } = await import("html2canvas");
        let canvas: HTMLCanvasElement | null = null;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (attempt > 0) {
            await waitForExportAssets(exportElement);
          }

          const { height, width } = getExportElementSize(exportElement);

          canvas = await html2canvas(exportElement, {
            backgroundColor: "#ffffff",
            height,
            logging: false,
            scale: 2,
            scrollX: 0,
            scrollY: 0,
            useCORS: true,
            width,
            windowHeight: height,
            windowWidth: width,
            onclone: (clonedDocument) => {
              const clonedExportArea = clonedDocument.getElementById("export-area");

              if (clonedExportArea) {
                applyCanvasSafePalette(clonedExportArea);
                clonedExportArea.style.left = "0";
                clonedExportArea.style.opacity = "1";
                clonedExportArea.style.position = "static";
                clonedExportArea.style.top = "0";
                clonedExportArea.style.transform = "none";
                clonedExportArea.style.visibility = "visible";
                clonedExportArea.style.zIndex = "1";
              }
            },
          });

          if (!isEmptyCanvas(canvas)) {
            break;
          }
        }

        if (!canvas || isEmptyCanvas(canvas)) {
          throw new Error(
            `PDF export failed: html2canvas returned an empty canvas. width=${
              canvas?.width ?? 0
            } height=${canvas?.height ?? 0}`
          );
        }

        const imageData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "pt", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 32;
        const imageWidth = pageWidth - margin * 2;
        const imageHeight = (canvas.height * imageWidth) / canvas.width;
        const usablePageHeight = pageHeight - margin * 2;

        let remainingHeight = imageHeight;
        let y = margin;

        pdf.addImage(imageData, "PNG", margin, y, imageWidth, imageHeight);
        remainingHeight -= usablePageHeight;

        while (remainingHeight > 0) {
          pdf.addPage();
          y -= usablePageHeight;
          pdf.addImage(imageData, "PNG", margin, y, imageWidth, imageHeight);
          remainingHeight -= usablePageHeight;
        }

        pdf.save(fileName);
      } catch (captureError) {
        console.warn("PDF screenshot export failed; using fallback PDF.", captureError);
        const fallbackPdf = new jsPDF("p", "pt", "a4");
        saveFallbackTripPdf(fallbackPdf, trip, exportData);
        fallbackPdf.save(fileName);
      }
      showToast("PDF exported.");
    } catch (error) {
      console.error("PDF export failed:", error);
      showToast("PDF export failed. Please try again.");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />
            <p className="mt-5 text-sm text-gray-500">
              Loading your travel plan...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="mx-auto flex min-h-[75vh] max-w-md items-center px-5">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight">
              Sign in required
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              This is a private trip page. Sign in to view and manage your
              saved itinerary.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Return home
            </Link>
          </section>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="print:hidden">
          <Navbar />
        </div>

        <main className="mx-auto flex min-h-[75vh] max-w-md items-center px-5">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight">
              Trip not found
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              This trip may have been deleted or may not belong to the current
              signed-in account.
            </p>
            <Link
              href="/dashboard"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Back to Dashboard
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const exportData = getTripExportData(trip);

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950 print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="px-5 py-8 md:px-8 md:py-12 print:px-0 print:py-0">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="print:hidden">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-semibold text-gray-500 transition hover:text-gray-950"
            >
              Back to My Trips
            </Link>
          </div>

          <section className="rounded-xl bg-gray-950 p-7 text-white shadow-xl shadow-gray-300/50 md:p-10 print:rounded-none print:bg-white print:p-0 print:text-gray-950 print:shadow-none">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 print:border-gray-200 print:bg-gray-100 print:text-gray-600">
                    AI Travel Plan
                  </span>

                  {trip.public && (
                    <span className="rounded-full bg-green-400/15 px-3 py-1.5 text-xs font-semibold text-green-200 print:bg-green-50 print:text-green-700">
                      Public
                    </span>
                  )}

                  {trip.favorite && (
                    <span className="rounded-full bg-pink-400/15 px-3 py-1.5 text-xs font-semibold text-pink-200 print:bg-pink-50 print:text-pink-700">
                      Favorite
                    </span>
                  )}
                </div>

                <p className="mt-8 text-sm font-medium uppercase tracking-[0.25em] text-white/50 print:text-gray-400">
                  Your journey to
                </p>

                <h1 className="mt-3 break-words text-4xl font-black sm:text-5xl md:text-6xl print:text-4xl">
                  {trip.destination}
                </h1>

                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base print:text-gray-500">
                  A personalized itinerary created with TripMuse, designed
                  around your time and budget.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 print:border-gray-200 print:bg-white">
                  <p className="text-xs text-white/50 print:text-gray-400">
                    Duration
                  </p>
                  <p className="mt-1 text-lg font-bold">{trip.days} days</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/10 px-5 py-4 print:border-gray-200 print:bg-white">
                  <p className="text-xs text-white/50 print:text-gray-400">
                    Budget
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {formatBudget(trip.budget)}
                  </p>
                </div>

                <div className="col-span-2 rounded-xl border border-white/10 bg-white/10 px-5 py-4 sm:col-span-1 print:border-gray-200 print:bg-white">
                  <p className="text-xs text-white/50 print:text-gray-400">
                    Created
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    {formatCreatedDate(trip.created_at)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3 print:hidden">
              <button
                type="button"
                onClick={toggleFavorite}
                disabled={updatingFavorite}
                className="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {trip.favorite ? "Favorited" : "Add to favorites"}
              </button>

              <button
                type="button"
                onClick={shareTrip}
                disabled={sharing}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sharing ? "Sharing..." : "Share trip"}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Print
              </button>

              <button
                type="button"
                onClick={exportPdf}
                disabled={exportingPdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingPdf && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {exportingPdf ? "Exporting PDF..." : "Export PDF"}
              </button>

              <button
                type="button"
                onClick={exportTicket}
                disabled={exportingTicket}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingTicket && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-950" />
                )}
                {exportingTicket ? "Creating Ticket..." : "Download Ticket"}
              </button>
            </div>
          </section>

          <ResultCard result={trip.result} />

          <div
            id="export-area"
            ref={pdfRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-[1] bg-white opacity-0"
          >
            <TripPdfDocument trip={trip} exportData={exportData} />
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-xl print:hidden">
          {toast}
        </div>
      )}
    </div>
  );
}
