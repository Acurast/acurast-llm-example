const { resolve } = require("path");
const fs = require("fs");
const webpack = require("webpack");

// Read the HTML content at build time
const htmlContent = fs.readFileSync(resolve(__dirname, "../chat-frontend/dist/index.html"), "utf-8");

module.exports = {
    entry: './src/index.ts',
    mode: 'production',
    output: {
        filename: 'bundle.js',
        path: resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.html$/,
                use: {
                    loader: 'raw-loader',
                    options: {
                        esModule: false
                    }
                }
            },
        ],
    },
    plugins: [
        // Define the HTML content as a global constant that will be inlined during build
        new webpack.DefinePlugin({
            // Ensure HTML_CONTENT is properly stringified and available globally
            'global.HTML_CONTENT': JSON.stringify(htmlContent),
            'globalThis.HTML_CONTENT': JSON.stringify(htmlContent),
            'HTML_CONTENT': JSON.stringify(htmlContent)
        })
    ],
    target: "node"
}
