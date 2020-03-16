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

const SelectInclude = ( { value, onChange, label = '', name } ) => {
	const id = name.replace( /\W+/g, '-' ).replace( /^\W+.*?\W+$/, '' );
	return (
		<StyledSelect
			id={ id }
			onChange={ onChange }
			value={ value }
			name={ name }
		>
			<option value="any">{ __( 'Match any of the following', 'altis-analytics' ) } { label }</option>
			<option value="all">{ __( 'Match all of the following', 'altis-analytics' ) } { label }</option>
		</StyledSelect>
	);
};

export default SelectInclude;
