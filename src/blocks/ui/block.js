import React from 'react';
import styled from 'styled-components';

import BlockABTest from './components/block-ab-test';
import BlockPersonalization from './components/block-personalization';

const { Icon } = wp.components;
const { useSelect } = wp.data;
const { decodeEntities } = wp.htmlEntities;
const { __ } = wp.i18n;

const BlockWrapper = styled.div`
	padding: 40px 60px;
	margin-left: -20px;

	& h1,
	& h2 {
		font-size: 24px;
		margin: 10px 0;
		line-height: 1;
	}
	& h1 + h2 {
		color: #4767df;
	}

	& h2 a {
		text-decoration: none;
		border-radius: 3px;
		margin-left: 4px;
		margin-top: -4px;
		border: 1px solid rgba(67, 108, 255, .4);
		width: 20px;
		height: 20px;
		display: inline-block;
		vertical-align: middle;
		padding: 0;
	}

	.altis-analytics-block-metrics {
		margin: 40px -60px;
		background-color: rgba(67, 108, 255, .05);
		padding: 20px 60px;
	}

	.altis-analytics-date-range {
		margin: 0 0 20px;
	}
`;

/**
 * Experience Block Analytics component.
 *
 * @param {object} props The component props.
 * @param {string} props.clientId The block client ID.
 * @returns {React.ReactNode} The block view component.
 */
const Block = ( {
	clientId,
} ) => {
	const block = useSelect( select => {
		return select( 'analytics/xbs' ).getPost( clientId );
	}, [ clientId ] );

	// Ensure we have a block ID data.
	if ( ! clientId ) {
		return (
			<div className="message error">
				<p>{ __( 'Experience Block not found.' ) }</p>
			</div>
		);
	}
	if ( block && block.error ) {
		return (
			<div className="message error">
				<p>{ block.error.message }</p>
			</div>
		);
	}

	const props = {
		block,
		clientId,
	};

	let BlockType = null;

	switch ( block?.subtype ) {
		case 'altis/personalization':
			BlockType = BlockPersonalization;
			break;
		case 'altis/ab-test':
			BlockType = BlockABTest;
			break;
		default:
			BlockType = null;
	}

	return (
		<BlockWrapper className="altis-analytics-block">
			<h1>{ __( 'Experience Insights', 'altis-analytics' ) }</h1>
			<h2>
				{ ( block && decodeEntities( block.title.rendered ) ) || __( 'Loading…', 'altis-analytics' ) }
				{ block && Number( block.parent ) > 0 && (
					<>
						{ ' ' }
						<a href={ `post.php?post=${ block.parent }&action=edit` }>
							<Icon icon="edit" />
							<span className="screen-reader-text">{ __( 'Edit block', 'altis-analytics' ) }</span>
						</a>
					</>
				) }
			</h2>
			{ BlockType && <BlockType { ...props } /> }
		</BlockWrapper>
	);
};

export default Block;
