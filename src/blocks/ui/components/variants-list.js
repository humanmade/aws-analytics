import React from 'react';
import styled from 'styled-components';

const { __ } = wp.i18n;

const StyledVariantsList = styled.div`
	padding-bottom: 30px;

	& h2 {
		color: #4767df;
	}

	.altis-analytics-block-variant {
		margin: 30px 0 40px;

		&--fallback {
			margin-bottom: 20px;
			border-bottom: 1px solid rgba( 0, 0, 0, .2 );
			padding-bottom: 20px;
		}
	}

	ul {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		margin: 10px 0 0;
		padding: 0;
	}

	li {
		margin-right: 40px;
		margin-top: 10px;
		display: flex;
		flex-direction: column-reverse;
	}

	h3, p {
		margin: 0;
	}

	h3 {
		margin-right: 40px;
	}

	li .description {
		text-transform: uppercase;
	}

	.altis-analytics-block-variant__metric {
		font-size: 24px;
		font-weight: bold;
		margin-bottom: 5px;
	}

	.audience-estimate svg {
		max-height: 30px;
	}

	.blue {
		color: #4767df;
	}
`;

/**
 * Show a styled list of experience block variants.
 *
 * @param {object} props Component props.
 * @param {React.ReactChildren} props.children Component children.
 * @returns {React.ReactNode} The sty;ed list.
 */
const VariantsList = ( { children } ) => {
	return (
		<StyledVariantsList>
			<h2>{ __( 'Block Variants', 'altis-analytics' ) }</h2>
			{ children }
		</StyledVariantsList>
	);
};

export default VariantsList;
