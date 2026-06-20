export function parseTrip(content) {
  try {
    if (!content) return null;

    let cleaned = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end === -1) return null;

    const jsonStr = cleaned.slice(start, end + 1);

    return JSON.parse(jsonStr);
  } catch (err) {
    console.log("parse error:", err);
    return null;
  }
}