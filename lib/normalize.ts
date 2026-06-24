export const EN_MAP: Record<string, string> = {
  重庆: "Chongqing",
  长沙: "Changsha",
  北京: "Beijing",
};

export function normalizeDestination(input: string) {
  return EN_MAP[input] || input;
}