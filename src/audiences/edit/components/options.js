import React from 'react';
import styled from 'styled-components';

import Estimate from './estimate';

const { Button } = wp.components;
const { __ } = wp.i18n;

const StyledOptions = styled.div.attrs( () => ( {
	className: 'audience-options',
} ) )`
	.audience-estimate {
		margin: 0 0 30px;
	}
`;

const Options = props => {
	const { audience } = props;

	return (
		<StyledOptions>
			<Estimate title={ __( 'Audience Estimate', 'altis-analytics' ) } audience={ audience } />
			<Button
				isLarge
				isPrimary
				type="submit"
			>
				{ __( 'Save changes' ) }
			</Button>
		</StyledOptions>
	);
};

export default Options;
