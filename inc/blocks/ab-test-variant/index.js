import blockData from './block.json';
import edit from './edit';
import save from './save';

const { registerBlockType } = wp.blocks;
const { __ } = wp.i18n;

const settings = {
	title: __( 'A/B Test Content Variant', 'altis-analytics' ),
	description: __( 'A/B Test content block items', 'altis-analytics' ),
	edit,
	save,
	...blockData.settings,
};

// Register block.
registerBlockType( blockData.name, settings );
