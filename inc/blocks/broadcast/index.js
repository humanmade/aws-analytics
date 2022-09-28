import blockData from './block.json';
import edit from './edit';
import Icon from './icon';
import save from './save';

const { registerBlockType } = wp.blocks;
const { __ } = wp.i18n;

const settings = {
	title: __( 'Broadcast', 'altis' ),
	description: __( 'Broadcast your blocks to a larger audience.', 'altis' ),
	keywords: [
		__( 'altis', 'altis' ),
		__( 'experience', 'altis' ),
		__( 'experiment', 'altis' ),
		__( 'analytics', 'altis' ),
		__( 'broadcast', 'altis' ),
	],
	edit,
	save,
	...blockData.settings,
	icon: Icon,
};

// Register block.
registerBlockType( blockData.name, settings );
