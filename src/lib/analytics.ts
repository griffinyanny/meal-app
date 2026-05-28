type EventProperties = Record<string, string | number | boolean | undefined>;

export const analytics = {
  track(event: string, properties?: EventProperties) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[analytics] ${event}`, properties);
    }
  },

  identify(userId: string, traits?: EventProperties) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[analytics:identify] ${userId}`, traits);
    }
  },
};
