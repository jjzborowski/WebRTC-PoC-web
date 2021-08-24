const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.join(__dirname, 'dist'),
    },
    devtool: 'source-map',
    devServer: { contentBase: './dist' },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.js?$/,
                include: path.resolve('./src'),
                loader: 'eslint-loader',
                options: { config: path.resolve('./.eslintrc') },
            },
            {
                test: /\.(js)$/,
                use: { loader: 'babel-loader' },
                exclude: /node_modules/,
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    resolve: {
        alias: {
            common: path.resolve(__dirname, 'src/common/'),
            components: path.resolve(__dirname, 'src/components/'),
        },
        extensions: ['.js'],
    },
    plugins: [new HtmlWebpackPlugin({ template: './src/index.html' })],
};
