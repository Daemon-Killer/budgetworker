module.exports = ({ config }) => {
  const plugins = (config.plugins ?? []).filter(
    (p) => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties',
  );
  return {
    ...config,
    plugins: [
      ...plugins,
      'expo-sharing',
      ['expo-build-properties', {
        android: {
          usesCleartextTraffic: (process.env.EXPO_PUBLIC_API_URL ?? '').startsWith('http://'),
        },
      }],
      ...(process.env.BUDGETWORKER_CMAKE_STAGING_DIR
        ? [["./plugins/windows-cmake", {
          stagingDirectory: process.env.BUDGETWORKER_CMAKE_STAGING_DIR,
        }]]
        : []),
    ],
  };
};
