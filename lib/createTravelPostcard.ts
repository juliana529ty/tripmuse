import type { TripExportData } from "@/components/ResultCard";

type TravelPostcardTrip = {
  created_at?: string;
  days: string | number;
  destination: string;
  id: string;
  public?: boolean | null;
};

type TravelPostcardOptions = {
  exportData: TripExportData;
  publicShareUrl?: string;
  trip: TravelPostcardTrip;
};

const POSTCARD_WIDTH = 1600;
const POSTCARD_HEIGHT = 1000;

function cleanText(value: string | null | undefined, fallback = "") {
  if (!value) return fallback;

  const text = String(value).trim();

  if (!text || /^(undefined|null)$/i.test(text)) {
    return fallback;
  }

  return text;
}

function formatCreatedDate(date?: string) {
  if (!date) return "Recently";

  return new Date(date).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getDurationLabel(days: string | number) {
  const value = cleanText(String(days), "1");
  const numericValue = Number(value);

  if (Number.isFinite(numericValue)) {
    return `${numericValue} day${numericValue === 1 ? "" : "s"}`;
  }

  return `${value} days`;
}

function getRegionLine(destination: string) {
  const text = destination.toLowerCase();
  const regions: Array<[RegExp, string]> = [
    [/(new york|nyc|manhattan)/, "United States"],
    [/(tokyo|osaka|kyoto|sapporo|okinawa|japan)/, "Japan"],
    [/(paris|france)/, "France"],
    [/(london|united kingdom|england|scotland|uk)/, "United Kingdom"],
    [/(rome|italy)/, "Italy"],
    [/(seoul|korea)/, "South Korea"],
    [/(singapore)/, "Singapore"],
    [/(sydney|melbourne|australia)/, "Australia"],
    [/(toronto|vancouver|montreal|canada)/, "Canada"],
    [/(barcelona|madrid|spain)/, "Spain"],
  ];
  const match = regions.find(([pattern]) => pattern.test(text));

  return match?.[1] || "";
}

function getPostcardMessage(exportData: TripExportData, destination: string) {
  const title = cleanText(exportData.title);

  if (title && title.toLowerCase() !== destination.toLowerCase()) {
    return title.replace(/\s+on\s+a\s+[$A-Z]{0,4}\s*[\d,]+(?:\.\d+)?\s+budget\b/i, "");
  }

  const foodIdea = exportData.food.find(Boolean);
  const travelTip = exportData.tips.find(Boolean);

  if (foodIdea && travelTip) {
    return `${destination} is ready for slow wandering, memorable meals, and one smart local tip: ${travelTip}`;
  }

  if (foodIdea) {
    return `${destination} is ready for slow wandering, scenic stops, and a memorable taste of ${foodIdea}.`;
  }

  return `A thoughtful TripMuse itinerary for ${destination}, shaped around the best moments from the plan.`;
}

function getHighlights(exportData: TripExportData) {
  const highlights = exportData.highlights.filter(Boolean).slice(0, 3);

  if (highlights.length > 0) {
    return highlights;
  }

  return ["Personalized itinerary", "Travel-friendly pacing", "Curated trip notes"];
}

function wrapText(
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

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  wrapText(context, text, maxWidth, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function drawFittedText(
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
    context.font = `${weight} ${fontSize}px Georgia, "Times New Roman", serif`;
    lines = wrapText(context, text, maxWidth, maxLines);

    if (lines.every((line) => context.measureText(line).width <= maxWidth)) {
      break;
    }

    fontSize -= 4;
  }

  const lineHeight = Math.round(fontSize * 1.02);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function drawRouteLine(context: CanvasRenderingContext2D) {
  context.save();
  context.strokeStyle = "rgba(185, 28, 28, 0.24)";
  context.lineWidth = 3;
  context.setLineDash([12, 12]);
  context.beginPath();
  context.moveTo(120, 730);
  context.bezierCurveTo(290, 650, 430, 780, 575, 690);
  context.bezierCurveTo(685, 620, 775, 635, 875, 575);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = "rgba(185, 28, 28, 0.72)";
  [
    [120, 730],
    [575, 690],
    [875, 575],
  ].forEach(([x, y]) => {
    context.beginPath();
    context.arc(x, y, 7, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();
}

function drawDestinationStamp(
  context: CanvasRenderingContext2D,
  destination: string,
  createdAt?: string
) {
  context.save();
  context.translate(1180, 132);
  context.rotate(-0.08);
  context.strokeStyle = "rgba(185, 28, 28, 0.64)";
  context.fillStyle = "rgba(185, 28, 28, 0.72)";
  context.lineWidth = 4;
  context.beginPath();
  context.ellipse(0, 0, 126, 54, 0, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, 106, 40, 0, 0, Math.PI * 2);
  context.stroke();

  context.font = "800 20px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.fillText("POSTCARD", 0, -8);
  context.font = "700 16px Arial, Helvetica, sans-serif";
  context.fillText(formatCreatedDate(createdAt).toUpperCase(), 0, 18);
  context.restore();

  context.save();
  context.strokeStyle = "rgba(185, 28, 28, 0.28)";
  context.lineWidth = 3;
  for (let index = 0; index < 3; index += 1) {
    context.beginPath();
    context.moveTo(1010, 180 + index * 24);
    context.bezierCurveTo(1080, 154 + index * 24, 1134, 208 + index * 24, 1210, 180 + index * 24);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = "rgba(17, 24, 39, 0.22)";
  context.lineWidth = 2;
  context.strokeRect(1305, 82, 150, 118);
  context.strokeRect(1320, 97, 120, 88);
  context.font = "700 14px Arial, Helvetica, sans-serif";
  context.fillStyle = "rgba(17, 24, 39, 0.46)";
  context.textAlign = "center";
  context.fillText("STAMP", 1380, 148);
  context.font = "600 12px Arial, Helvetica, sans-serif";
  context.fillText(cleanText(getRegionLine(destination), "TRAVEL"), 1380, 168);
  context.restore();
}

function drawPostcardBack(
  context: CanvasRenderingContext2D,
  options: TravelPostcardOptions,
  destination: string,
  highlights: string[],
  message: string
) {
  context.save();
  context.strokeStyle = "rgba(17, 24, 39, 0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(1190, 310);
  context.lineTo(1190, 858);
  context.stroke();

  context.fillStyle = "#111827";
  context.font = "700 32px Georgia, 'Times New Roman', serif";
  context.fillText(`A note from ${destination}`, 985, 340);

  context.fillStyle = "#4b5563";
  context.font = "400 23px Arial, Helvetica, sans-serif";
  drawWrappedText(context, message, 985, 398, 325, 34, 5);

  context.fillStyle = "#111827";
  context.font = "700 19px Arial, Helvetica, sans-serif";
  context.fillText("Destination", 985, 628);
  context.fillText("Duration", 985, 702);
  context.fillText("Created", 985, 776);

  context.fillStyle = "#4b5563";
  context.font = "400 24px Arial, Helvetica, sans-serif";
  drawWrappedText(context, destination, 985, 662, 180, 30, 1);
  context.fillText(getDurationLabel(options.trip.days), 985, 736);
  context.fillText(formatCreatedDate(options.trip.created_at), 985, 810);

  context.fillStyle = "#111827";
  context.font = "700 21px Arial, Helvetica, sans-serif";
  context.fillText("Highlights", 1240, 628);

  context.font = "400 20px Arial, Helvetica, sans-serif";
  highlights.forEach((highlight, index) => {
    context.fillStyle = "#111827";
    context.fillText(`0${index + 1}`, 1240, 674 + index * 58);
    context.fillStyle = "#4b5563";
    drawWrappedText(context, highlight, 1280, 674 + index * 58, 230, 24, 2);
  });

  context.fillStyle = "#6b7280";
  context.font = "600 18px Arial, Helvetica, sans-serif";
  context.fillText("Made with TripMuse", 985, 892);

  if (options.publicShareUrl) {
    context.strokeStyle = "rgba(17, 24, 39, 0.22)";
    context.strokeRect(1324, 820, 118, 58);
    context.fillStyle = "#4b5563";
    context.font = "600 13px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.fillText("SHARE URL", 1383, 846);
    context.fillText("AVAILABLE", 1383, 864);
    context.textAlign = "left";
  }

  context.restore();
}

function getPostcardFileName(destination: string) {
  const baseName = `${destination || "tripmuse"}-tripmuse-postcard`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${baseName || "tripmuse-postcard"}.png`;
}

export function getTravelPostcardFileName(trip: TravelPostcardTrip) {
  return getPostcardFileName(trip.destination);
}

export async function createTravelPostcardImage(options: TravelPostcardOptions) {
  await document.fonts?.ready;

  const canvas = document.createElement("canvas");
  canvas.width = POSTCARD_WIDTH;
  canvas.height = POSTCARD_HEIGHT;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not supported in this browser.");
  }

  const destination = cleanText(options.exportData.destination, options.trip.destination || "Your Trip");
  const regionLine = getRegionLine(destination);
  const highlights = getHighlights(options.exportData);
  const message = getPostcardMessage(options.exportData, destination);
  const tagline =
    cleanText(options.exportData.title) ||
    cleanText(options.exportData.tips[0]) ||
    `A personalized travel plan for ${destination}.`;

  context.fillStyle = "#f7f1e8";
  context.fillRect(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);

  const paperGradient = context.createLinearGradient(0, 0, POSTCARD_WIDTH, POSTCARD_HEIGHT);
  paperGradient.addColorStop(0, "#fffaf0");
  paperGradient.addColorStop(0.55, "#f8efe1");
  paperGradient.addColorStop(1, "#f4eadc");
  context.fillStyle = paperGradient;
  context.fillRect(46, 46, POSTCARD_WIDTH - 92, POSTCARD_HEIGHT - 92);

  context.strokeStyle = "rgba(17, 24, 39, 0.12)";
  context.lineWidth = 2;
  context.strokeRect(46, 46, POSTCARD_WIDTH - 92, POSTCARD_HEIGHT - 92);

  context.fillStyle = "rgba(255, 255, 255, 0.58)";
  context.fillRect(86, 96, 830, 808);

  context.strokeStyle = "rgba(17, 24, 39, 0.08)";
  context.strokeRect(86, 96, 830, 808);

  drawRouteLine(context);
  drawDestinationStamp(context, destination, options.trip.created_at);

  context.fillStyle = "#111827";
  context.font = "800 30px Arial, Helvetica, sans-serif";
  context.fillText("TRIPMUSE POSTCARD", 124, 158);

  context.fillStyle = "#b91c1c";
  context.font = "700 18px Arial, Helvetica, sans-serif";
  context.fillText("WISH YOU WERE HERE", 124, 206);

  context.fillStyle = "#111827";
  drawFittedText(context, destination, 124, 372, 680, 2, 104, 58);

  if (regionLine) {
    context.fillStyle = "#6b7280";
    context.font = "600 26px Arial, Helvetica, sans-serif";
    context.fillText(regionLine.toUpperCase(), 128, 456);
  }

  context.fillStyle = "#374151";
  context.font = "400 28px Arial, Helvetica, sans-serif";
  drawWrappedText(context, tagline, 128, 548, 650, 38, 3);

  context.fillStyle = "#111827";
  context.font = "700 22px Arial, Helvetica, sans-serif";
  context.fillText(getDurationLabel(options.trip.days).toUpperCase(), 128, 680);

  context.fillStyle = "#111827";
  context.font = "700 21px Arial, Helvetica, sans-serif";
  context.fillText("ON THE ROUTE", 128, 760);

  context.font = "400 21px Arial, Helvetica, sans-serif";
  highlights.slice(0, 3).forEach((highlight, index) => {
    const y = 810 + index * 40;
    context.fillStyle = "#b91c1c";
    context.beginPath();
    context.arc(136, y - 7, 4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#374151";
    drawWrappedText(context, highlight, 154, y, 430, 25, 1);
  });

  context.fillStyle = "#6b7280";
  context.font = "600 18px Arial, Helvetica, sans-serif";
  context.fillText("TripMuse / AI Travel Planner", 662, 878);

  drawPostcardBack(context, options, destination, highlights, message);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        resolve(blob);
      } else {
        reject(new Error("Unable to create postcard image."));
      }
    }, "image/png");
  });
}
