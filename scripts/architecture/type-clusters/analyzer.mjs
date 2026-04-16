export const scoreCluster = ({ declarationCount, domainCount, totalUsage }) => {
  return declarationCount * 3 + Math.min(domainCount, 5) * 2 + Math.min(totalUsage, 20);
};
