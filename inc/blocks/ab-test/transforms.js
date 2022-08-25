import variantBlockData from '../ab-test-variant/block.json';

import blockData from './block.json';

const { createBlock } = wp.blocks;
const { select } = wp.data;

/**
 * Returns an array of selected block objects.
 *
 * Note: This removes the need for __experimentalConvert transform attribute, which includes full objects with block names.
 *
 * @returns {object} Selected blocks' objects.
 */
function getSelectedBlocks() {
	const {
		getSelectedBlockCount,
		getSelectedBlock,
		getMultiSelectedBlocks,
	} = select( 'core/block-editor' );

	return getSelectedBlockCount() > 1 ? getMultiSelectedBlocks() : [ getSelectedBlock() ];
}

const transforms = {
	from: [
		{
			type: 'block',
			isMultiBlock: true,
			blocks: [ '*' ],
			/**
			 * Define transform rules from other blocks.
			 *
			 * @returns {object} Return a personalization block with nested original block.
			 */
			transform: () => createBlock(
				blockData.name,
				{},
				[
					createBlock(
						variantBlockData.name,
						{
							fallback: true,
							variant: null,
						},
						getSelectedBlocks().map( block => createBlock( block.name, block.attributes, block.innerBlocks ) )
					),
				]
			),
			/**
			 * Exclude blocks that we cannot nest, eg: self instances, and anything with defined parent attribute.
			 *
			 * @returns {bool} Whether the original block qualifies for transformation.
			 */
			isMatch: () => ! getSelectedBlocks().filter( block =>
				block.name === blockData.name
				|| wp.blocks.getBlockType( block.name ).parent?.length
			).length,
		},
	],
};

export default transforms;
