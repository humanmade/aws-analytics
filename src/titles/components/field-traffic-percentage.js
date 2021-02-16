import React, { Fragment } from 'react';
import styled from 'styled-components';

const { RangeControl } = wp.components;
const { __ } = wp.i18n;

const StyledRangeControl = styled( RangeControl )`
	.components-base-control__field { justify-content: flex-start; }
	.components-range-control__wrapper { margin-left: 0; }
	.components-range-control__slider { flex: 1 1 50%; }
`;

const TrafficPercentage = props => {
	const { value, onChange } = props;

	return (
		<Fragment>
			<StyledRangeControl
				label={ __( 'Traffic Percentage' ) }
				value={ value }
				onChange={ onChange }
				help={ __( 'This is the amount of traffic that will be shown one of the variants.' ) }
				min={ 0 }
				max={ 100 }
			/>
		</Fragment>
	);
};

export default TrafficPercentage;
