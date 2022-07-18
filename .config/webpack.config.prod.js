const { helpers, externals, loaders, presets } = require( '@humanmade/webpack-helpers' );
const { filePath } = helpers;

// Mutate the loader defaults.
loaders.ts.defaults.loader = 'babel-loader';
// Increase url-loader limit to embed logo inline.
loaders.url.defaults.options.limit = 200000;

module.exports = presets.production( {
	externals,
	entry: {
		accelerate: filePath( 'src/accelerate/index.tsx' ),
		dashboard: filePath( 'src/dashboard/index.tsx' ),
	},
	output: {
		path: filePath( 'build' ),
	},
	resolve: {
		extensions: [
			'.ts',
			'.tsx',
			'.wasm',
			'.mjs',
			'.js',
			'.json',
		],
	},
} );
