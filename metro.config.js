const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration for Expo
 * https://docs.expo.dev/guides/customizing-metro/
 */
const config = getDefaultConfig(__dirname);

// ONNX 모델 파일을 asset으로 인식하도록 설정
config.resolver.assetExts.push('onnx');

module.exports = config;

