const { createBlock, cloneBlock } = wp.blocks;
const { compose } = wp.compose;
const { withSelect, withDispatch } = wp.data;

/**
 * Reset the traffic percentage between varianbt blocks.
 *
 * @param {object[]} blocks Array of inner blocks.
 * @returns {object[]} Modified array of inner blocks.
 */
const resetTrafficPercentage = blocks => {
	// Reset traffic percentage for each.
	const defaultPercentage = Number( 100 / blocks.length );
	return blocks.map( block => {
		block.attributes.percentage = defaultPercentage;
		return block;
	} );
};

/**
 * Returns an upgraded React Component with experience block data store connectors.
 *
 * @param {React.ReactNode} Component React component to enhance.
 * @returns {React.ReactNode} Enhanced component.
 */
const withData = Component => compose(
	withSelect( ( select, ownProps ) => {
		const { clientId } = ownProps;
		const { getBlocks } = select( 'core/block-editor' );
		const { getCurrentPost } = select( 'core/editor' );

		const currentPost = getCurrentPost();
		const innerBlocks = getBlocks( clientId );

		return {
			currentPost,
			variants: innerBlocks,
		};
	} ),
	withDispatch( ( dispatch, ownProps, registry ) => {
		return {
			/**
			 * Adds a variant to the store.
			 *
			 * @param {object} attributes Variant attributes object.
			 * @returns {string} The new variant block client ID.
			 */
			onAddVariant( attributes = {} ) {
				const { clientId } = ownProps;
				const { replaceInnerBlocks, selectBlock } = dispatch( 'core/block-editor' );
				const { getBlocks } = registry.select( 'core/block-editor' );

				const newVariant = createBlock( 'altis/ab-test-variant', {
					fallback: false,
					goal: '',
					title: '',
					...attributes,
				}, [] );

				// Append the new variant.
				const innerBlocks = resetTrafficPercentage( [
					...getBlocks( clientId ),
					newVariant,
				] );

				// Update the inner blocks.
				replaceInnerBlocks( clientId, innerBlocks );

				// Focus defaults to the newly added inner block so keep it on the parent.
				selectBlock( clientId );

				// Return new client ID to enable selection.
				return newVariant.clientId;
			},
			/**
			 * Copies an existing variant.
			 *
			 * @param {string} variantClientId The source variant client ID.
			 * @returns {string} The new variant block client ID.
			 */
			onCopyVariant( variantClientId ) {
				const { replaceInnerBlocks } = dispatch( 'core/block-editor' );
				const {
					getBlock,
					getBlocks,
					getBlockRootClientId,
				} = registry.select( 'core/block-editor' );

				const experienceBlockClientId = getBlockRootClientId( variantClientId );
				const variantBlocks = getBlocks( experienceBlockClientId );

				// Clone the the block.
				const fromVariant = getBlock( variantClientId );
				const newVariant = cloneBlock( fromVariant, {
					fallback: false,
					goal: '',
					title: '',
				} );

				// Always append new variants.
				const nextBlocks = resetTrafficPercentage( [
					...variantBlocks,
					newVariant,
				] );

				replaceInnerBlocks( experienceBlockClientId, nextBlocks );

				return newVariant.clientId;
			},
			/**
			 * Removes a block variant.
			 *
			 * @param {string} variantClientId Client ID for variant block to remove.
			 */
			onRemoveVariant( variantClientId ) {
				const { clientId, attributes } = ownProps;
				const { replaceInnerBlocks } = dispatch( 'core/block-editor' );
				const { getBlocks } = registry.select( 'core/block-editor' );

				// Prevent removal of the fallback variant.
				if ( attributes.fallback ) {
					return;
				}

				// Remove inner block by clientId.
				const innerBlocks = resetTrafficPercentage(
					getBlocks( clientId ).filter( block => block.clientId !== variantClientId )
				);

				// Update the inner blocks.
				replaceInnerBlocks( clientId, innerBlocks );
			},
			/**
			 * Select & focus the block.
			 */
			onSelect() {
				const { clientId } = ownProps;
				const { selectBlock } = dispatch( 'core/block-editor' );
				selectBlock( clientId );
			},
		};
	} )
)( Component );

export default withData;
