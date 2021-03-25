import blockData from './block.json';
import Status from './components/status';
import edit from './edit';
import save from './save';

const { registerBlockType } = wp.blocks;
const { addFilter } = wp.hooks;
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

// Enhance publication checklist if available.
addFilter( 'altis-publishing-workflow.item.xbs-valid-conversions', 'altis/xbs', () => {
	return Status;
} );
