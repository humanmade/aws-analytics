import React, { Fragment } from 'react';
import styled from 'styled-components';

const { RangeControl } = wp.components;
const { __ } = wp.i18n;

const StyledRangeControl = styled( RangeControl )`
	.components-base-control__field { justify-content: flex-start; }
	.components-range-control__wrapper { margin-left: 0; }
	.components-range-control__slider { flex: 1 1 50%; }
`;

/**
 * Traffic percentage input component.
 *
 * @param {React.ComponentProps} props The component props.
 * @returns {React.ReactNode} Traffic percentage input component.
 */
const TrafficPercentage = props => {
	const { value, onChange } = props;

	return (
		<Fragment>
			<StyledRangeControl
				help={ __( 'This is the amount of traffic that will be shown one of the variants.' ) }
				label={ __( 'Traffic Percentage' ) }
				max={ 100 }
				min={ 0 }
				value={ value }
				onChange={ onChange }
			/>
		</Fragment>
	);
};

export default TrafficPercentage;
