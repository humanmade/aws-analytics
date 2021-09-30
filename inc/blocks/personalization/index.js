import blockData from './block.json';
import shimBlockData from '../shim/block.json';
import Status from './components/status';
import edit from './edit';
import save from './save';
import transforms from './transforms';

const { registerBlockType } = wp.blocks;
const { addFilter } = wp.hooks;
const { __ } = wp.i18n;

const settings = {
	title: __( 'Personalized Content', 'altis-analytics' ),
	description: __( 'Deliver personalized content to different audiences', 'altis-analytics' ),
	keywords: [
		__( 'experience', 'altis-analytics' ),
		__( 'personalize', 'altis-analytics' ),
		__( 'conditional', 'altis-analytics' ),
		__( 'audience', 'altis-analytics' ),
		__( 'analytics', 'altis-analytics' ),
	],
	edit,
	save,
	transforms,
	...blockData.settings,
};

// Register block.
registerBlockType( blockData.name, settings );

// Register shim.
registerBlockType( shimBlockData.name, {
	title: 'shim',
	...shimBlockData.settings,
} );

// Enhance publication checklist if available.
addFilter( 'altis-publishing-workflow.item.xbs-valid-conversions', 'altis/xbs', () => {
	return Status;
} );
addFilter( 'altis-publishing-workflow.item.xbs-valid-fallback', 'altis/xbs', () => {
	return Status;
} );
