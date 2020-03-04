import React from 'react';
import styled from 'styled-components';
import { defaultAudience } from '../data/defaults';

const { Button } = wp.components;
const { __ } = wp.i18n;

const StyledOptions = styled.div.attrs( () => ( {
	className: "audience-options"
} ) )`

`;

const Options = props => {
	const {
		audience,
	} = props;

	return (
		<StyledOptions>
			<h3>{ __( 'Estimated audience size', 'altis-analytics' ) }</h3>
			<p>120</p>

			<Button
				isLarge={ true }
				isPrimary={ true }
				type="submit"
				onClick={ e => {
					e.preventDefault();
				} }
			>
				{ __( 'Save changes' ) }
			</Button>
		</StyledOptions>
	);
}

Options.defaultProps = {
	audience: defaultAudience,
};

export default Options;
