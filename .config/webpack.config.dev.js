const { helpers, externals, loaders, presets } = require( '@humanmade/webpack-helpers' );
const { choosePort, filePath } = helpers;

// Mutate the loader defaults.
loaders.ts.defaults.loader = 'babel-loader';

module.exports = choosePort( 3000 ).then( port => (
	presets.development( {
		externals,
		devServer: {
			port,
			https: true,
		},
		entry: {
			dashboard: filePath( 'src/dashboard/index.tsx' ),
		},
		output: {
			path: filePath( 'build' ),
			publicPath: `https://localhost:${ port }/`,
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
	} )
) );
