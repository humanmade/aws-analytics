import React from 'react';

const { IconButton } = wp.components;
const { __ } = wp.i18n;

/**
 * Toolbar options for a variant.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Toolbar component for a variant.
 */
const VariantToolbar = props => {
	const {
		canRemove,
		isFallback,
		onCopy,
		onRemove,
	} = props;

	return (
		<div className="altis-experience-block-header__toolbar">
			<IconButton
				icon="migrate"
				title={ __( 'Copy variant', 'altis-analytics' ) }
				onClick={ onCopy }
			>
				{ __( 'Copy', 'altis-analytics' ) }
			</IconButton>
			{ ! isFallback && (
				<IconButton
					disabled={ ! canRemove }
					icon="trash"
					title={ __( 'Remove variant', 'altis-analytics' ) }
					onClick={ onRemove }
				/>
			) }
		</div>
	);
};

export default VariantToolbar;
