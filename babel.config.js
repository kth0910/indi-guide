module.exports = function(api) {
  api.cache(true);
  
  const plugins = [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@services': './src/services',
          '@utils': './src/utils',
          '@types': './src/types',
          '@store': './src/store',
        },
      },
    ],
    'react-native-worklets-core/plugin',
    'react-native-reanimated/plugin',
  ];

  // 프로덕션 빌드에서 console.log 제거
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};

