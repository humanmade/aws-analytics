import blockData from './block.json';

import edit from './edit';
import save from './save';
import transforms from './transforms';

const { registerBlockType } = wp.blocks;
const { __ } = wp.i18n;

const settings = {
	title: __( 'A/B Test', 'altis-analytics' ),
	description: __( 'Test variations of your content to find the best', 'altis-analytics' ),
	keywords: [
		__( 'experience', 'altis-analytics' ),
		__( 'test', 'altis-analytics' ),
		__( 'experiment', 'altis-analytics' ),
		__( 'analytics', 'altis-analytics' ),
	],
	edit,
	save,
	transforms,
	...blockData.settings,
};

// Register block.
registerBlockType( blockData.name, settings );
