// Next.js build cache configuration
module.exports = {
  // Enable persistent caching
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
};
