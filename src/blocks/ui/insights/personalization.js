import React, { useState } from 'react';

import { compactMetric } from '../../../utils';
import { defaultVariantAnalytics } from '../../data/shapes';
import Cards from '../components/cards';
import DateRange from '../components/date-range';
import Variants from '../components/variants';

const { useSelect } = wp.data;
const { __ } = wp.i18n;

/**
 * Experience Block Analytics component.
 *
 * @param {object} props The component props.
 * @param {object} props.block The block post data.
 * @param {string} props.clientId The block client ID.
 * @returns {React.ReactNode} The block view component.
 */
const Personalization = ( {
	block,
	clientId,
} ) => {
	const [ days, setDays ] = useState( 7 );
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

	// Get percentage of personalised block views.
	let personalisedCoverage = null;
	if ( analytics ) {
		const fallback = analytics.variants.find( variant => variant.id === 0 ) || defaultVariantAnalytics;
		personalisedCoverage = 100 - ( ( fallback.unique.views / analytics.unique.views ) * 100 );
	}

	return (
		<>
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
				append={ ( { variant, data } ) => {
					if ( variant.fallback ) {
						return;
					}
					return (
						<li>
							<p className="description">{ __( 'Audience coverage', 'altis-analytics' ) }</p>
							<div className="altis-analytics-block-variant__metric blue">{ ( analytics && data ) ? compactMetric( ( data.unique.views / analytics.unique.views ) * 100, '%' ) : '…' }</div>
						</li>
					);
				} }
				variants={ ( block && block.variants ) || null }
			/>

		</>
	);
};

export default Personalization;
