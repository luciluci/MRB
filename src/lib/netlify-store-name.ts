export function netlifyStoreName(context: string | undefined): string {
  return context === "production" ? "mrb-demo" : `mrb-demo-${context || "dev"}`;
}
