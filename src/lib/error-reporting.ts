export const errorReporting = {
  capture(error: unknown, context?: Record<string, string>) {
    if (process.env.NODE_ENV === "development") {
      console.error("[error-reporting]", error, context);
    }
  },
};
