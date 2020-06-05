import React from 'react';
import styled from 'styled-components';

const { __ } = wp.i18n;

const StyledSelect = styled.select`
	vertical-align: middle;

	&:not(:hover, :focus) {
		border: none;
		background: none;
		margin-right: 8px;
	}
`;

export default function SelectInclude( props ) {
	return (
		<StyledSelect { ...props }>
			<option value="any">{ __( 'Match any of the following', 'altis-analytics' ) } { props.label }</option>
			<option value="all">{ __( 'Match all of the following', 'altis-analytics' ) } { props.label }</option>
		</StyledSelect>
	);
}

SelectInclude.defaultProps = {
	label: '',
};
