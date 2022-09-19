import _ from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { compactMetric, getLift } from '../../../utils';

const { __ } = wp.i18n;

const StyledLift = styled.div`
	font-weight: bold;
	color: ${ props => isNaN( props.lift ) || props.lift >= 0 ? '#29A36A' : '#E85984' };
	transition: color 250ms linear;
	> span {
		font-size: 80%;
	}
	.dashicons {
		vertical-align: baseline;
		display: inline-block;
		position: relative;
		top: 0.1rem;
		font-size: 70%;
	}
`;

/**
 * Get a styled lift metric component.
 *
 * @param {object} props The component props.
 * @param {number} props.current The current value to compare.
 * @param {number} props.previous The old value to comapre.
 * @param {string} props.className The component base class name.
 * @returns {React.ReactNode} The lift metric compoennt.
 */
export default function Lift( props ) {
	const {
		current = 0,
		previous = 0,
		className = 'altis-analytics-lift',
	} = props;

	const lift = getLift( current, previous );

	return (
		<StyledLift className={ className } lift={ lift }>
			{ lift >= 0 || isNaN( lift )
				? <span className="dashicons dashicons-arrow-up-alt"><span className="screen-reader-text">{ __( 'Up', 'altis-accelerate' ) }</span></span>
				: <span className="dashicons dashicons-arrow-down-alt"><span className="screen-reader-text">{ __( 'Down', 'altis-accelerate' ) }</span></span> }
			{ compactMetric( ( isNaN( lift ) ? lift : Math.abs( lift ) ), '%' ) }
		</StyledLift>
	);
}
