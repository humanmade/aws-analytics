import React from 'react';

import { VariantLabelContainer } from '.';

const { __ } = wp.i18n;
const { Icon } = wp.components;

/**
 * Variant label component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Variant label component.
 */
const VariantLabel = props => {
	const {
		label,
		isEditable,
		onRemove,
	} = props;

	return (
		<VariantLabelContainer>
			<label className="components-base-control__label">{ label }</label>
			{ isEditable && (
				<Icon
					className='components-base-control__icon'
					icon='remove'
					title={ __( 'Remove', 'altis-analytics' ) }
					onClick={ onRemove }
				/>
			) }
		</VariantLabelContainer>
	);
};

export default VariantLabel;
