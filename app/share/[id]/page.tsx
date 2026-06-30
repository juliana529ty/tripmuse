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
const TICKET_STAMP_SRC = "/assets/tripmuse-stamp.png";

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
  drawFittedSingleLine(context, value, x, y + 52, width, 34, 24);
}

function drawFittedSingleLine(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  maxFontSize: number,
  minFontSize: number,
  weight = 800
) {
  let fontSize = maxFontSize;
  let displayText = text;

  while (fontSize >= minFontSize) {
    context.font = `${weight} ${fontSize}px Arial, Helvetica, sans-serif`;

    if (context.measureText(displayText).width <= maxWidth) {
      context.fillText(displayText, x, y);
      return;
    }

    fontSize -= 2;
  }

  context.font = `${weight} ${minFontSize}px Arial, Helvetica, sans-serif`;

  while (
    displayText.length > 1 &&
    context.measureText(`${displayText.slice(0, -1)}...`).width > maxWidth
  ) {
    displayText = displayText.slice(0, -1);
  }

  context.fillText(`${displayText.slice(0, -1)}...`, x, y);
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
    const height = 74 + ((char.charCodeAt(0) + index) % 4) * 8;

    context.fillRect(x, baselineY - height, width, height);
    x += width + 7;
  });
}

function loadTicketStampImage() {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.decoding = "async";
    image.loading = "eager";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load TripMuse stamp image."));
    image.src = TICKET_STAMP_SRC;
  });
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  if (!naturalWidth || !naturalHeight) {
    throw new Error("TripMuse stamp image has no readable dimensions.");
  }

  const imageRatio = naturalWidth / naturalHeight;
  const boxRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > boxRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;

  context.save();
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
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
  const stampImage = await loadTicketStampImage();

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

  drawContainedImage(context, stampImage, 650, 210, 310, 220);

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
  wrapCanvasText(context, title, 110, 545, 760, 36, 1);

  drawTicketField(context, "Duration", `${trip.days} days`, 110, 595, 190);
  drawTicketField(
    context,
    "Budget",
    formatTicketBudget(trip.budget, destination),
    325,
    595,
    250
  );
  drawTicketField(
    context,
    "Issued",
    formatCreatedDate(trip.created_at),
    620,
    595,
    310
  );

  context.fillStyle = "#6b7280";
  context.font = "700 20px Arial, Helvetica, sans-serif";
  context.fillText("HIGHLIGHTS", 1030, 218);

  context.fillStyle = "#030712";
  context.font = "700 20px Arial, Helvetica, sans-serif";
  highlights.forEach((highlight, index) => {
    wrapCanvasText(context, `- ${highlight}`, 1030, 264 + index * 62, 280, 25, 2);
  });

  drawTicketBarcode(context, ticketCode, 1030, 545);

  context.fillStyle = "#030712";
  context.font = "800 31px Arial, Helvetica, sans-serif";
  context.fillText(ticketCode, 1030, 640);

  context.fillStyle = "#6b7280";
  context.font = "400 22px Arial, Helvetica, sans-serif";
  context.fillText("TRIP PASS ID", 1030, 596);
  context.fillText("Made with TripMuse", 1030, 680);

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

function TicketBarcode({ code }: { code: string }) {
  return (
    <div className="flex h-20 items-end gap-[5px] overflow-hidden">
      {code.split("").map((char, index) => {
        if (char === "-") {
          return <span key={`${char}-${index}`} className="w-2 shrink-0" />;
        }

        return (
          <span
            key={`${char}-${index}`}
            className="block shrink-0 bg-gray-950"
            style={{
              height: `${52 + ((char.charCodeAt(0) + index) % 4) * 8}px`,
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

      <div className="grid min-h-[520px] lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-[520px] flex-col">
          <div className="flex items-center justify-between bg-gray-950 px-6 py-5 text-white md:px-10">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-black text-gray-950">
                TM
              </span>
              <p className="text-xl font-black md:text-3xl">TRIPMUSE TICKET</p>
            </div>
          </div>

          <div className="relative flex flex-1 flex-col justify-between gap-8 px-6 pb-10 pt-8 md:px-10">
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
                <p className="mt-6 line-clamp-2 text-xl leading-8 text-gray-600">
                  {exportData.title}
                </p>
              </div>

              <div className="hidden justify-self-end md:block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={TICKET_STAMP_SRC}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="h-36 w-56 object-contain md:h-48 md:w-72"
                />
              </div>
            </div>

            <dl className="grid gap-5 sm:grid-cols-[160px_minmax(190px,240px)_minmax(190px,1fr)]">
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase text-gray-500">
                  Duration
                </dt>
                <dd className="mt-2 truncate text-2xl font-black text-gray-950">
                  {trip.days} days
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase text-gray-500">
                  Budget
                </dt>
                <dd className="mt-2 truncate text-2xl font-black text-gray-950">
                  {formatTicketBudget(trip.budget, destination)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-bold uppercase text-gray-500">
                  Issued
                </dt>
                <dd className="mt-2 truncate text-xl font-black leading-tight text-gray-950">
                  {formatCreatedDate(trip.created_at)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <aside className="flex min-h-[520px] flex-col overflow-hidden border-t border-dashed border-gray-300 bg-white px-6 pb-9 pt-8 lg:border-l lg:border-t-0 md:px-8">
          <p className="mt-1 text-sm font-bold uppercase text-gray-500">
            AI Travel Pass
          </p>
          <p className="mt-10 text-sm font-bold uppercase text-gray-500">
            Highlights
          </p>
          <ul className="mt-5 space-y-3 text-base font-bold leading-5 text-gray-950">
            {highlights.map((highlight) => (
              <li key={highlight} className="line-clamp-2 min-h-10">
                - {highlight}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <TicketBarcode code={ticketCode} />
          </div>

          <p className="mt-4 text-sm text-gray-500">TRIP PASS ID</p>
          <p className="mt-2 truncate text-2xl font-black text-gray-950">{ticketCode}</p>
          <p className="mt-4 text-base font-semibold text-gray-500">
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
