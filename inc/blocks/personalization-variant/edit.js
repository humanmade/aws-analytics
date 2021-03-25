import React, { useEffect } from 'react';

import VariantValidation from '../personalization/components/variant-validation';

const { InnerBlocks } = wp.blockEditor;
const { compose } = wp.compose;
const { withSelect, withDispatch } = wp.data;

/**
 * Personalized content variant edit mode component.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {object} props.attributes The block attributes.
 * @param {Array} props.blocks The inner blocks.
 * @param {string} props.clientId The block client ID.
 * @param {boolean} props.hasChildBlocks True if the block has children.
 * @param {boolean} props.isSelected True if the block currently selected.
 * @param {Function} props.onSelect Function to select the parent block.
 * @returns {React.ReactNode} The variant edit mode component.
 */
const Edit = ( {
	attributes,
	blocks,
	clientId,
	hasChildBlocks,
	isSelected,
	onSelect,
} ) => {
	// Select the block parent if a variant is directly selected.
	useEffect( () => {
		if ( isSelected ) {
			onSelect();
		}
	}, [ isSelected, onSelect ] );

	const props = {};
	if ( ! hasChildBlocks ) {
		/**
		 * If we don't have any child blocks, show large block appender button.
		 *
		 * @returns {InnerBlocks.DefaultBlockAppender} Block appender component.
		 */
		props.renderAppender = () => <InnerBlocks.DefaultBlockAppender />;
	}

	return (
		<div
			data-block={ clientId }
			data-type="altis/personalization-variant"
		>
			<VariantValidation
				blocks={ blocks }
				clientId={ clientId }
				goal={ attributes.goal }
			/>
			<InnerBlocks
				{ ...props }
			/>
		</div>
	);
};

export default compose(
	withSelect( ( select, ownProps ) => {
		const { clientId } = ownProps;
		const { getBlockOrder, getBlocks } = select( 'core/block-editor' );

		return {
			blocks: getBlocks( clientId ),
			hasChildBlocks: getBlockOrder( clientId ).length > 0,
		};
	} ),
	withDispatch( ( dispatch, ownProps, registry ) => {
		const { clientId } = ownProps;
		const { getBlockRootClientId } = registry.select( 'core/block-editor' );
		const { selectBlock } = dispatch( 'core/block-editor' );

		// Get parent block client ID.
		const rootClientId = getBlockRootClientId( clientId );

		return {
			/**
			 * Function to select the parent block.
			 *
			 * @returns {object} Redux action object.
			 */
			onSelect: () => selectBlock( rootClientId ),
		};
	} )
)( Edit );
