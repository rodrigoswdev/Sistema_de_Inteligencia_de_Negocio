export const isDemoMode = () => process.env.DEMO_MODE !== "false";

export const hasDatabaseConfiguration = () =>
  Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
