import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "18px",
          background:
            "linear-gradient(135deg, #111827 0%, #312e81 55%, #7c3aed 100%)",
          color: "white",
          fontSize: "32px",
          fontWeight: 900,
          letterSpacing: "-2px",
        }}
      >
        T
      </div>
    ),
    {
      ...size,
    }
  );
}