module.exports = ({ config }) => {
  const customer = process.env.EXPO_PUBLIC_APP_VARIANT === 'customer';
  const plugins = (config.plugins ?? []).filter(
    (p) => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties',
  );
  return {
    ...config,
    ...(customer ? {
      name: 'BudgetWorker',
      slug: 'budgetworker-customer',
      scheme: 'budgetworkercustomer',
      version: '1.0.0',
      android: { ...config.android, package: 'in.budgetworker.customer', versionCode: Number(process.env.BUDGETWORKER_ANDROID_VERSION_CODE || 1) },
      ios: { ...config.ios, bundleIdentifier: 'in.budgetworker.customer', buildNumber: '1' },
    } : {}),
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
