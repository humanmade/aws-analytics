import React, { useEffect } from 'react';

const { InnerBlocks } = wp.blockEditor;
const { compose } = wp.compose;
const { withSelect, withDispatch } = wp.data;

const Edit = ( {
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
	}, [ isSelected ] );

	const props = {};
	if ( ! hasChildBlocks ) {
		// If we don't have any child blocks, show large block appender button.
		props.renderAppender = () => <InnerBlocks.DefaultBlockAppender />;
	}

	return (
		<div
			data-type="altis/personalization-variant"
			data-block={ clientId }
		>
			<InnerBlocks
				{ ...props }
			/>
		</div>
	);
};

export default compose(
	withSelect( ( select, ownProps ) => {
		const { clientId } = ownProps;
		const { getBlockOrder } = select( 'core/block-editor' );

		return {
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
			onSelect: () => selectBlock( rootClientId ),
		};
	} ),
)( Edit );
