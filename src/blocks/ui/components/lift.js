import React from 'react';
import styled from 'styled-components';

import { compactMetric, getLift } from '../../../utils';

const StyledLift = styled.div`
	font-weight: bold;
	color: ${ props => props.lift >= 0 ? '#29A36A' : '#E85984' };
	span {
		font-size: 80%;
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
			<span>{ lift >= 0 || isNaN( lift ) ? '⬆' : '⬇' }</span>
			{ compactMetric( lift ) }
		</StyledLift>
	);
}
