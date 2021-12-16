import React from 'react';
import styled from 'styled-components';

const { withSelect } = wp.data;
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
	return (
		<Icon winner={ Boolean( props.winner ) }>
			{ __( 'A/B', 'altis-analytics' ) }
		</Icon>
	);
};

export default withSelect( ( select, props ) => {
	const tests = select( 'core/editor' ).getEditedPostAttribute( 'ab_tests' );

	return {
		// Check if we have any winners.
		winner: Object.values( tests ).filter( test => test?.results?.winner ).length,
	};
} )( PluginIcon );
