var path = require('path');

module.exports = {
    entry: path.join(__dirname, 'srcjs', 'dtsmartr.jsx'),
    output: {
        path: path.join(__dirname, 'inst/htmlwidgets'),
        filename: 'dtsmartr.js'
    },
    module: {
        rules: [
            {
                test: /\.(jsx?|mjs)$/,
                loader: 'babel-loader',
                type: 'javascript/auto',
                options: {
                    presets: ['@babel/preset-env', '@babel/preset-react']
                }
            }
        ]
    },
    externals: {
        'react': 'window.React',
        'react-dom': 'window.ReactDOM'
    },
    stats: {
        colors: true
    },
    devtool: 'source-map'
};