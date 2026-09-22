const fs = require('fs');
const path = require('path');

const getConfigFile = (environmentName, fileName) => {
  const candidates = [
    process.env[environmentName],
    path.join(__dirname, 'secrets', fileName),
    path.join(__dirname, fileName),
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate));
};

module.exports = ({ config }) => {
  const iosGoogleServicesFile = getConfigFile(
    'GOOGLE_SERVICE_INFO_PLIST',
    'GoogleService-Info.plist'
  );
  const androidGoogleServicesFile = getConfigFile(
    'GOOGLE_SERVICES_JSON',
    'google-services.json'
  );

  return {
    ...config,
    ios: {
      ...config.ios,
      ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
    android: {
      ...config.android,
      ...(androidGoogleServicesFile ? { googleServicesFile: androidGoogleServicesFile } : {}),
    },
    plugins: [
      ...(config.plugins || []),
      '@react-native-firebase/app',
      [
        '@react-native-firebase/analytics',
        {
          ios: {
            withoutAdIdSupport: true,
          },
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'dynamic',
          },
        },
      ],
    ],
  };
};
