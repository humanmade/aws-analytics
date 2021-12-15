const path = require( 'path' );

const { CleanWebpackPlugin } = require( 'clean-webpack-plugin' );
const DynamicPublicPathPlugin = require( 'dynamic-public-path-webpack-plugin' );
const webpack = require( 'webpack' );
const BundleAnalyzerPlugin = require( 'webpack-bundle-analyzer' )
	.BundleAnalyzerPlugin;
const ManifestPlugin = require( 'webpack-manifest-plugin' );
const SriPlugin = require( 'webpack-subresource-integrity' );

const mode = process.env.NODE_ENV || 'production';

const sharedConfig = {
	mode: mode,
	entry: {
		'analytics': path.resolve( __dirname, 'src/analytics.js' ),
		'audiences/data': path.resolve( __dirname, 'src/audiences/data/index.js' ),
		'audiences/preview': path.resolve( __dirname, 'src/audiences/preview/index.js' ),
		'audiences/ui': path.resolve( __dirname, 'src/audiences/index.js' ),
		'blocks/data': path.resolve( __dirname, 'src/blocks/data/index.js' ),
		'blocks/ui': path.resolve( __dirname, 'src/blocks/index.js' ),
		'blocks/personalization': path.resolve( __dirname, 'inc/blocks/personalization/index.js' ),
		'blocks/personalization-variant': path.resolve( __dirname, 'inc/blocks/personalization-variant/index.js' ),
		'blocks/ab-test': path.resolve( __dirname, 'inc/blocks/ab-test/index.js' ),
		'blocks/ab-test-variant': path.resolve( __dirname, 'inc/blocks/ab-test-variant/index.js' ),
		'experiments': path.resolve( __dirname, 'src/experiments.js' ),
		'experiments/sidebar': path.resolve( __dirname, 'src/experiments/index.js' ),
		'experiment': path.resolve( __dirname, 'src/experiments/index.js' ),
		'titles': path.resolve( __dirname, 'src/experiments/titles/index.js' ),
		'featured-images': path.resolve( __dirname, 'src/experiments/featured-images/index.js' ),
		'blocks/ab-test-preview': path.resolve( __dirname, 'src/ab-test-preview.js' ),
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
		'moment': 'moment',
	},
};

if ( mode === 'production' ) {
	sharedConfig.plugins.push( new DynamicPublicPathPlugin( {
		externalGlobal: 'window.Altis.Analytics.BuildURL',
		chunkName: 'audiences/ui',
	} ) );
	sharedConfig.plugins.push( new DynamicPublicPathPlugin( {
		externalGlobal: 'window.Altis.Analytics.Experiments.BuildURL',
		chunkName: 'experiments',
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
