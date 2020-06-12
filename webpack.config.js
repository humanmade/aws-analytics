const path = require( 'path' );
const webpack = require( 'webpack' );
const mode = process.env.NODE_ENV || 'production';
const BundleAnalyzerPlugin = require( 'webpack-bundle-analyzer' )
	.BundleAnalyzerPlugin;
const DynamicPublicPathPlugin = require( 'dynamic-public-path-webpack-plugin' );
const SriPlugin = require( 'webpack-subresource-integrity' );
const ManifestPlugin = require( 'webpack-manifest-plugin' );
const { CleanWebpackPlugin } = require( 'clean-webpack-plugin' );

const sharedConfig = {
	mode: mode,
	entry: {
		analytics: path.resolve( __dirname, 'src/analytics.js' ),
		audiences: path.resolve( __dirname, 'src/audiences/index.js' ),
		preview: path.resolve( __dirname, 'src/preview/index.js' ),
	},
	output: {
		path: path.resolve( __dirname, 'build' ),
		filename: '[name].[hash:8].js',
		chunkFilename: 'chunk.[id].[chunkhash:8].js',
		publicPath: '/',
		libraryTarget: 'this',
		jsonpFunction: 'AltisAnalyticsJSONP',
		crossOriginLoading: 'anonymous',
	},
	module: {
		rules: [
			{
				test: /\.m?js$/,
				exclude: /(node_modules|bower_components)/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: [
							require( '@babel/preset-env' ),
							require( '@babel/preset-react' ),
						],
						plugins: [
							require( '@babel/plugin-transform-runtime' ),
							require( '@babel/plugin-proposal-class-properties' ),
							require( '@wordpress/babel-plugin-import-jsx-pragma' ),
						],
					},
				},
			},
		],
	},
	optimization: {
		noEmitOnErrors: true,
	},
	plugins: [
		new webpack.EnvironmentPlugin( {
			SC_ATTR: 'data-styled-components-altis-analytics',
		} ),
		new ManifestPlugin( {
			writeToFileEmit: true,
		} ),
		new CleanWebpackPlugin(),
	],
	externals: {
		'Altis': 'Altis',
		'wp': 'wp',
		'react': 'React',
		'react-dom': 'ReactDOM',
		'lodash': 'lodash',
	},
};

if ( mode === 'production' ) {
	sharedConfig.plugins.push( new DynamicPublicPathPlugin( {
		externalGlobal: 'window.Altis.Analytics.BuildURL',
		chunkName: 'audiences',
	} ) );
	sharedConfig.plugins.push( new SriPlugin( {
		hashFuncNames: [ 'sha384' ],
		enabled: true,
	} ) );
} else {
	sharedConfig.devtool = 'cheap-module-eval-source-map';
}

if ( process.env.ANALYSE_BUNDLE ) {
	// Add bundle analyser.
	sharedConfig.plugins.push( new BundleAnalyzerPlugin() );
}

module.exports = sharedConfig;
