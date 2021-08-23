import React from 'react';
import styled from 'styled-components';

import withTestData from '../data/with-test-data';

const { __ } = wp.i18n;

const Icon = styled.span.attrs( props => ( {
	className: props.winner ? 'has-results' : '',
} ) )`
	font-weight: bold;

	&.has-results::after {
		content: '';
		display: inline-block;
		margin-bottom: 0px;
		margin-left: 7px;
		width: .6rem;
		height: .6rem;
		border-radius: 100px;
		background: #e2182c;
		box-shadow: inset 0 0 2px rgba(0,0,0,.15);
	}
`;

/**
 * Sidebar plugin icon component.
 *
 * @param {React.ComponentProps} props The plugin icon props.
 * @returns {React.ReactNode} The custom plugin icon component.
 */
const PluginIcon = props => {
	const { test } = props;
	const { results } = test || {};
	const { winner = null } = results || {};

	return (
		<Icon winner={ Boolean( winner ) }>
			{ __( 'A/B', 'altis-experiments' ) }
		</Icon>
	);
};

export default withTestData( PluginIcon );
