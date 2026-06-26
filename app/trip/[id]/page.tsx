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

  const exportPdf = async () => {
    if (!trip || !pdfRef.current || exportingPdf) return;

    setExportingPdf(true);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(pdfRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
      });

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

      const fileName = `${trip.destination || "tripmuse"}-itinerary.pdf`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      pdf.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
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
            </div>
          </section>

          <ResultCard result={trip.result} />

          <div
            ref={pdfRef}
            aria-hidden="true"
            className="pointer-events-none fixed left-[-10000px] top-0 z-[-1]"
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
