import blockData from './block.json';
import edit from './edit';
import save from './save';

const { registerBlockType } = wp.blocks;
const { __ } = wp.i18n;

const settings = {
	title: __( 'Personalized Content Variant', 'altis-experiments' ),
	description: __( 'Personalized content block items', 'altis-experiments' ),
	edit,
	save,
	...blockData.settings,
};

// Register block.
registerBlockType( blockData.name, settings );
