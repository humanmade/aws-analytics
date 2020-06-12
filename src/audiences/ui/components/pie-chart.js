import React from 'react';
import styled from 'styled-components';

const StyledPie = styled.svg`
	circle {
		fill: transparent;
		stroke: ${ props => props.stroke || 'rgb(0, 124, 186)' };
		stroke-linecap: round;
		stroke-opacity: 0.2;
		stroke-dasharray: 101 100;
		stroke-dashoffset: 0;
		stroke-width: 3;
		transform: rotate(-90deg);
		transform-origin: center;
		transition: stroke-dasharray 0.3s ease-in-out;
	}
	circle[data-percent] {
		stroke-dasharray: ${ props => props.percent === 100 ? 101 : props.percent } 100;
		stroke-opacity: 1;
	}
	text {
		stroke-width: 0;
		font-size: 9px;
	}
`;

export default function PieChart( props ) {
	return (
		<StyledPie viewBox="0 0 36 36" { ...props }>
			<circle r="16" cx="18" cy="18" />
			<circle data-percent r="16" cx="18" cy="18" />
			<text x="18" y="21" textAnchor="middle">{ props.percent }%</text>
		</StyledPie>
	);
}

PieChart.defaultProps = {
	percent: 0,
};
