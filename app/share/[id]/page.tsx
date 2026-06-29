"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ResultCard, { getTripExportData } from "@/components/ResultCard";
import { supabase } from "@/lib/supabase";

type Trip = {
  id: string;
  destination: string;
  days: string | number;
  budget: string | number;
  result: unknown;
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

function createTicketCode(trip: Trip) {
  return `TM-${trip.id.slice(0, 4).toUpperCase()}-${trip.id
    .slice(-4)
    .toUpperCase()}`;
}

function getTripTicketFileName(trip: Trip) {
  const fileName = `${trip.destination || "tripmuse"}-ticket.png`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return fileName.endsWith(".png") ? fileName : `${fileName}.png`;
}

function getTripPdfFileName(trip: Trip) {
  const fileName = `${trip.destination || "tripmuse"}-shared-itinerary.pdf`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
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
  const stampParts = getTicketStampParts(destination);
  const topArcSpan = Math.min(96, Math.max(56, stampParts.location.length * 9));
  const bottomArcSpan = Math.min(130, Math.max(86, stampParts.country.length * 7));

  context.save();
  context.strokeStyle = accentColor;
  context.fillStyle = accentColor;
  context.lineWidth = 3;

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

  drawTicketField(context, "Duration", `${trip.days} days`, 110, 620, 190);
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

function addPdfSection(
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

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(55, 65, 81);

  return nextY + 28;
}

function saveSharedTripPdf(
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
  y = addPdfSection(pdf, "Day-by-Day Itinerary", y, pageWidth, pageHeight, margin);

  if (exportData.days.length > 0) {
    exportData.days.forEach((day) => {
      y = ensurePdfPageSpace(pdf, y, pageHeight, margin, 70);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(3, 7, 18);
      pdf.text(day.title, margin, y);
      y += 20;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(55, 65, 81);
      y = addWrappedPdfText(pdf, `Morning: ${day.morning}`, margin, y, textWidth, pageHeight, margin);
      y = addWrappedPdfText(pdf, `Afternoon: ${day.afternoon}`, margin, y, textWidth, pageHeight, margin);
      y = addWrappedPdfText(pdf, `Evening: ${day.evening}`, margin, y, textWidth, pageHeight, margin);
      y = addWrappedPdfText(pdf, `Tip: ${day.tip}`, margin, y, textWidth, pageHeight, margin);
      y += 10;
    });
  } else {
    y = addWrappedPdfText(pdf, "No daily itinerary provided.", margin, y, textWidth, pageHeight, margin);
  }

  y = addPdfSection(pdf, "Highlights", y + 8, pageWidth, pageHeight, margin);
  (exportData.highlights.length ? exportData.highlights : ["No highlights provided."]).forEach((item) => {
    y = addWrappedPdfText(pdf, `- ${item}`, margin, y, textWidth, pageHeight, margin);
  });

  y = addPdfSection(pdf, "Food", y + 8, pageWidth, pageHeight, margin);
  (exportData.food.length ? exportData.food : ["No food recommendations provided."]).forEach((item) => {
    y = addWrappedPdfText(pdf, `- ${item}`, margin, y, textWidth, pageHeight, margin);
  });

  y = addPdfSection(pdf, "Travel Tips", y + 8, pageWidth, pageHeight, margin);
  (exportData.tips.length ? exportData.tips : ["No travel tips provided."]).forEach((item) => {
    y = addWrappedPdfText(pdf, `- ${item}`, margin, y, textWidth, pageHeight, margin);
  });

  y = addPdfSection(pdf, "Budget", y + 8, pageWidth, pageHeight, margin);
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

function DestinationStampSvg({
  country,
  location,
}: {
  country: string;
  location: string;
}) {
  return (
    <svg
      viewBox="0 0 300 300"
      aria-hidden="true"
      className="h-36 w-36 text-red-600 md:h-44 md:w-44"
    >
      <defs>
        <path id="ticket-stamp-top" d="M 84 130 A 66 66 0 0 1 216 130" />
        <path id="ticket-stamp-bottom" d="M 224 171 A 76 76 0 0 1 76 171" />
      </defs>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <circle cx="150" cy="150" r="118" strokeWidth="3" />
        <circle cx="150" cy="150" r="105" strokeWidth="2" />
        <circle cx="150" cy="150" r="70" strokeWidth="2" />
        {[34, 46, 58, 124, 136, 148, 214, 226, 238, 304, 316, 328].map((angle) => {
          const radians = (angle * Math.PI) / 180;
          const x1 = 150 + Math.cos(radians) * 94;
          const y1 = 150 + Math.sin(radians) * 94;
          const x2 = 150 + Math.cos(radians) * 105;
          const y2 = 150 + Math.sin(radians) * 105;

          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              strokeWidth="2"
            />
          );
        })}
        <path d="M108 151h84v46h-84z" strokeWidth="3" />
        <path d="M108 151a42 42 0 0 1 84 0" strokeWidth="3" />
        <path d="M126 197v-30M174 197v-30" strokeWidth="2" />
        <circle cx="150" cy="115" r="28" strokeWidth="3" />
        <path d="M122 115h56M150 87c-15 20-15 36 0 56M150 87c15 20 15 36 0 56" strokeWidth="2" />
        <path d="M53 205c33-49 74 21 112-27 25-32 55-21 82 16" strokeWidth="3" />
        <path d="M62 205v-19M91 190v-20M205 186v-22M232 198v-23" strokeWidth="2" />
        <path d="M112 70l5 12 13 4-13 4-5 12-5-12-13-4 13-4zM202 76l4 9 10 3-10 3-4 9-4-9-10-3 10-3z" strokeWidth="2" />
        <path d="M-6 213c37-20 73-20 110 0s73 20 110 0" strokeWidth="2" />
        <path d="M-6 232c37-20 73-20 110 0s73 20 110 0" strokeWidth="2" />
        <path d="M-6 251c37-20 73-20 110 0s73 20 110 0" strokeWidth="2" />
      </g>
      <g fill="currentColor" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800">
        <text fontSize="22">
          <textPath href="#ticket-stamp-top" startOffset="50%" textAnchor="middle">
            {location}
          </textPath>
        </text>
        <text fontSize="16">
          <textPath href="#ticket-stamp-bottom" startOffset="50%" textAnchor="middle">
            {country}
          </textPath>
        </text>
        <text x="150" y="232" textAnchor="middle" fontSize="18">
          JOURNEY
        </text>
      </g>
    </svg>
  );
}

function TicketBarcode({ code }: { code: string }) {
  return (
    <div className="flex h-24 items-end gap-[5px] overflow-hidden">
      {code.split("").map((char, index) => {
        if (char === "-") {
          return <span key={`${char}-${index}`} className="w-2 shrink-0" />;
        }

        return (
          <span
            key={`${char}-${index}`}
            className="block shrink-0 bg-gray-950"
            style={{
              height: `${58 + ((char.charCodeAt(0) + index) % 4) * 10}px`,
              width: `${3 + ((char.charCodeAt(0) + index) % 5) * 2}px`,
            }}
          />
        );
      })}
    </div>
  );
}

function TicketPreview({
  trip,
  exportData,
}: {
  trip: Trip;
  exportData: TripExportData;
}) {
  const destination = exportData.destination || trip.destination || "Your Trip";
  const highlights =
    exportData.highlights.length > 0
      ? exportData.highlights.slice(0, 3)
      : ["AI itinerary", "Travel tips", "Budget guidance"];
  const ticketCode = createTicketCode(trip);
  const stampParts = getTicketStampParts(destination);
  const destinationLength = destination.length;
  const destinationTitleClass =
    destinationLength > 30
      ? "text-4xl md:text-5xl"
      : destinationLength > 18
        ? "text-5xl md:text-6xl"
        : "text-5xl md:text-7xl";

  return (
    <section className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60">
      <div className="pointer-events-none absolute left-[72%] top-0 z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-50 shadow-inner" />
      <div className="pointer-events-none absolute bottom-0 left-[72%] z-10 h-11 w-11 -translate-x-1/2 translate-y-1/2 rounded-full bg-gray-50 shadow-inner" />

      <div className="grid min-h-[430px] lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col">
          <div className="flex items-center justify-between bg-gray-950 px-6 py-5 text-white md:px-10">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-gray-950">
                TM
              </span>
              <p className="text-xl font-black md:text-3xl">TRIPMUSE TICKET</p>
            </div>
          </div>

          <div className="relative flex-1 px-6 py-8 md:px-10">
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
              <div>
                <h1
                  className={`line-clamp-2 break-words font-black leading-[0.98] text-gray-950 ${destinationTitleClass}`}
                >
                  {destination}
                </h1>
                <div className="mt-8 flex items-center gap-4">
                  <span className="h-3 w-3 rounded-full bg-red-600" />
                  <span className="h-px flex-1 bg-gray-300" />
                </div>
                <p className="mt-7 line-clamp-2 text-xl leading-8 text-gray-600">
                  {exportData.title}
                </p>
              </div>

              <div className="hidden justify-self-end md:block">
                <DestinationStampSvg
                  country={stampParts.country}
                  location={stampParts.location}
                />
              </div>
            </div>

            <dl className="mt-10 grid gap-5 sm:grid-cols-[180px_240px_minmax(220px,1fr)]">
              <div>
                <dt className="text-xs font-bold uppercase text-gray-500">
                  Duration
                </dt>
                <dd className="mt-2 whitespace-nowrap text-2xl font-black text-gray-950">
                  {trip.days} days
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-gray-500">
                  Budget
                </dt>
                <dd className="mt-2 whitespace-nowrap text-2xl font-black text-gray-950">
                  {formatTicketBudget(trip.budget, destination)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase text-gray-500">
                  Issued
                </dt>
                <dd className="mt-2 whitespace-nowrap text-xl font-black leading-tight text-gray-950">
                  {formatCreatedDate(trip.created_at)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <aside className="border-t border-dashed border-gray-300 bg-white px-6 py-8 lg:border-l lg:border-t-0 md:px-8">
          <p className="mt-1 text-sm font-bold uppercase text-gray-500">
            AI Travel Pass
          </p>
          <p className="mt-12 text-sm font-bold uppercase text-gray-500">
            Highlights
          </p>
          <ul className="mt-5 space-y-4 text-lg font-bold leading-6 text-gray-950">
            {highlights.map((highlight) => (
              <li key={highlight} className="line-clamp-2">
                - {highlight}
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <TicketBarcode code={ticketCode} />
          </div>

          <p className="mt-5 text-sm text-gray-500">TRIP PASS ID</p>
          <p className="mt-2 text-2xl font-black text-gray-950">{ticketCode}</p>
          <p className="mt-5 text-base font-semibold text-gray-500">
            Made with TripMuse
          </p>
        </aside>
      </div>
    </section>
  );
}

export default function ShareTripPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingTicket, setExportingTicket] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let pageIsActive = true;

    const loadTrip = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("trip_records")
        .select("*")
        .eq("id", id)
        .eq("public", true)
        .single();

      if (!pageIsActive) return;

      if (error) {
        console.log("Load shared trip error:", error);
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

    toastTimer.current = setTimeout(() => setToast(""), 1800);
  };

  const copyShareLink = async () => {
    const shareUrl = window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Share link copied.");
    } catch {
      window.prompt("Copy this share link:", shareUrl);
      showToast("Share link ready.");
    }
  };

  const exportTicket = async () => {
    if (!trip || exportingTicket) return;

    setExportingTicket(true);

    try {
      const exportData = getTripExportData(trip);
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
      const { jsPDF } = await import("jspdf");
      const exportData = getTripExportData(trip);
      const pdf = new jsPDF("p", "pt", "a4");

      saveSharedTripPdf(pdf, trip, exportData);
      pdf.save(getTripPdfFileName(trip));
      showToast("PDF downloaded.");
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
        <Navbar />

        <main className="flex min-h-[75vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-gray-200 border-t-gray-950" />
            <p className="mt-5 text-sm text-gray-500">
              Loading this travel plan...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <Navbar />

        <main className="mx-auto flex min-h-[75vh] max-w-md items-center px-5">
          <section className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold tracking-tight text-gray-950">
              This trip is unavailable
            </h1>
            <p className="mt-3 text-sm leading-7 text-gray-500">
              The trip may be private, deleted, or the share link may be
              incorrect.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Create my own trip
            </Link>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  const exportData = getTripExportData(trip);

  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-950">
      <Navbar />

      <main className="px-5 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-8">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600">
                Shared with TripMuse
              </span>
              <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                Public trip
              </span>
            </div>

            <TicketPreview trip={trip} exportData={exportData} />

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportTicket}
                disabled={exportingTicket}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingTicket && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {exportingTicket ? "Creating Ticket..." : "Download Ticket"}
              </button>

              <button
                type="button"
                onClick={exportPdf}
                disabled={exportingPdf}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exportingPdf && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-950" />
                )}
                {exportingPdf ? "Creating PDF..." : "Download PDF"}
              </button>

              <button
                type="button"
                onClick={copyShareLink}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-950 transition hover:bg-gray-50"
              >
                Copy Link
              </button>

              <Link
                href="/#planner"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Create my own trip
              </Link>
            </div>
          </div>

          <ResultCard result={trip.result} />
        </div>
      </main>

      <Footer />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
