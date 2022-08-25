import React, { useState } from 'react';
import styled from 'styled-components';

import { defaultVariantAnalytics } from '../data/shapes';

import Cards from './components/cards';
import DateRange from './components/date-range';
import Variants from './components/variants';

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
	const [ days, setDays ] = useState( 7 );
	const block = useSelect( select => {
		return select( 'analytics/xbs' ).getPost( clientId );
	}, [ clientId ] );
	const analytics = useSelect( select => {
		return select( 'analytics/xbs' ).getViews( clientId, { days } );
	}, [ clientId, days ] );
	const lift = useSelect( select => {
		const current = select( 'analytics/xbs' ).getViews( clientId, { days: 7 } );
		const previous = select( 'analytics/xbs' ).getViews( clientId, {
			days: 7,
			offset: 7,
		} );
		return {
			current,
			previous,
		};
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

	// Get percentage of personalised block views.
	let personalisedCoverage = null;
	if ( analytics ) {
		const fallback = analytics.audiences.find( audience => audience.id === 0 ) || defaultVariantAnalytics;
		personalisedCoverage = 100 - ( ( fallback.unique.views / analytics.unique.views ) * 100 );
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

			<div className="altis-analytics-block-metrics">
				<DateRange ranges={ [ 7, 30, 90 ] } value={ days } onSetRange={ setDays } />
				<Cards
					cards={ [
						{
							color: 'yellow',
							icon: 'visibility',
							title: __( 'Block Views', 'altis-analytics' ),
							metric: analytics ? analytics.unique.views : null,
							lift: {
								current: lift.current && lift.current.unique.views,
								previous: lift.previous && lift.previous.unique.views,
							},
							description: __( 'Total number of times this block has been viewed by unique visitors to the website.', 'altis-analytics' ),
						},
						{
							color: 'green',
							icon: 'thumbs-up',
							title: __( 'Conversion Rate', 'altis-analytics' ),
							metric: analytics ? ( ( analytics.unique.conversions / analytics.unique.views ) * 100 ) : null,
							lift: {
								current: lift.current && ( lift.current.unique.conversions / lift.current.unique.views ),
								previous: lift.previous && ( lift.previous.unique.conversions / lift.previous.unique.views ),
							},
							description: analytics && analytics.unique.conversions === 0
								? __( 'There are no conversions recorded yet, you may need to choose a conversion goal other than impressions for your variants.' )
								: __( 'Average conversion of the block as a percentage of total unique views of the block.', 'altis-analytics' ),
						},
						{
							color: 'blue',
							icon: 'groups',
							title: __( 'Personalization Coverage', 'altis-analytics' ),
							metric: personalisedCoverage,
							description: __( 'The percentage of visitors who are seeing personalised content.', 'altis-analytics' ),
						},
					] }
				/>
			</div>

			<Variants
				analytics={ analytics }
				variants={ ( block && block.variants ) || null }
			/>

		</BlockWrapper>
	);
};

export default Block;
