import blockData from './block.json';
import edit from './edit';
import save from './save';

const { registerBlockType } = wp.blocks;
const { __ } = wp.i18n;

const settings = {
	title: __( 'Personalized Content', 'altis-experiments' ),
	description: __( 'Deliver personalized content to different audiences', 'altis-experiments' ),
	keywords: [
		__( 'experience', 'altis-experiments' ),
		__( 'personalize', 'altis-experiments' ),
		__( 'conditional', 'altis-experiments' ),
		__( 'audience', 'altis-experiments' ),
		__( 'analytics', 'altis-experiments' ),
	],
	edit,
	save,
	...blockData.settings,
};

// Register block.
registerBlockType( blockData.name, settings );
