// Optional local Windows build workaround; cloud builds keep Expo defaults.
const { withAppBuildGradle } = require("expo/config-plugins");

module.exports = (config, { stagingDirectory }) => {
  if (!/^[A-Za-z]:\/[A-Za-z0-9/_.-]+$/.test(stagingDirectory))
    throw new Error("CMake staging directory must be a safe absolute Windows path");
  return withAppBuildGradle(config, (result) => {
    const marker = "// Budget Worker short CMake staging";
    if (!result.modResults.contents.includes(marker)) {
      result.modResults.contents += `\n${marker}\nandroid {\n  externalNativeBuild { cmake { buildStagingDirectory file('${stagingDirectory}') } }\n  defaultConfig { externalNativeBuild { cmake { arguments '-DCMAKE_OBJECT_PATH_MAX=250' } } }\n}\n`;
    }
    return result;
  });
};
