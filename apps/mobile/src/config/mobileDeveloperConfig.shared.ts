export type KangurMobileDeveloperConfigSources = {
  extraDevAutoSignIn?: boolean;
  extraDevLearnerLogin?: string;
  extraDevLearnerPassword?: string;
};

export type KangurMobileDeveloperConfig = {
  autoSignIn: boolean;
  learnerLoginName: string | null;
  learnerPassword: string | null;
};

const normalizeDeveloperConfigValue = (
  value: string | undefined,
): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
};

export const resolveKangurMobileDeveloperConfigFromSources = ({
  extraDevAutoSignIn,
  extraDevLearnerLogin,
  extraDevLearnerPassword,
}: KangurMobileDeveloperConfigSources): KangurMobileDeveloperConfig => ({
  autoSignIn: extraDevAutoSignIn === true,
  learnerLoginName: normalizeDeveloperConfigValue(extraDevLearnerLogin),
  learnerPassword: normalizeDeveloperConfigValue(extraDevLearnerPassword),
});
