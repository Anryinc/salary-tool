const webpack = require('webpack');

module.exports = function override(config) {
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "stream": require.resolve("stream-browserify"),
        "crypto": require.resolve("crypto-browserify"),
        "util": require.resolve("util/"),
        "url": require.resolve("url/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "assert": require.resolve("assert/"),
        "buffer": require.resolve("buffer/"),
        "process": require.resolve("process/browser"),
    };

    config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"];
    config.ignoreWarnings = [/Failed to parse source map/];

    config.plugins = [
        ...config.plugins,
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.DefinePlugin({
            'process.env': JSON.stringify(process.env)
        })
    ];

    return config;
}; 