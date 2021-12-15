import React from 'react';
import { compactMetric, getLift } from '../../../utils';
import { defaultVariantAnalytics } from '../../data/shapes';

import Cards from './cards';
import Timeline from './timeline';
import Variants from './variants';

const { useSelect } = wp.data;
const { __ } = wp.i18n;

/**
 * Personalized Content Block Analytics component.
 *
 * @param {object} props The component props.
 * @param {object} props.block The block post data.
 * @param {string} props.clientId The block client ID.
 * @returns {React.ReactNode} The block view component.
 */
const BlockABTest = ( {
	block,
	clientId,
} ) => {
	const analytics = useSelect( select => {
		return select( 'analytics/xbs' ).getViews( clientId, { days: 90 } );
	}, [ clientId ] );

	const test = block.ab_tests?.xb;

	// Calculate aggregated data.
	const originalData = ( analytics?.variants && analytics.variants[0]?.unique ) || defaultVariantAnalytics.unique;
	const variantsData = ( analytics?.variants || [] ).reduce( ( carry, variant, index ) => {
		if ( index === 0 ) {
			return carry;
		}

		carry.loads += variant.unique.loads;
		carry.views += variant.unique.views;
		carry.conversions += variant.unique.conversions;
		return carry;
	}, defaultVariantAnalytics.unique );

	return (
		<>
			<div className="altis-analytics-block-metrics">
				{ test.end_time && (
					<Timeline
						end={ new Date( test.end_time ) }
						start={ new Date( test.start_time ) }
					/>
				) }
				<Cards
					cards={ [
						{
							color: 'yellow',
							icon: 'visibility',
							title: __( 'Block Views', 'altis-analytics' ),
							metric: analytics ? analytics.unique.views : null,
							description: __( 'Total number of times this block has been viewed by unique visitors to the website.', 'altis-analytics' ),
						},
						{
							color: 'green',
							icon: 'thumbs-up',
							title: __( 'Conversion Rate', 'altis-analytics' ),
							metric: analytics ? ( ( analytics.unique.conversions / analytics.unique.views ) * 100 ) : null,
							description: analytics && analytics.unique.conversions === 0
								? __( 'There are no conversions recorded yet, you may need to choose a conversion goal other than impressions for your variants.' )
								: __( 'Average conversion of the block as a percentage of total unique views of the block.', 'altis-analytics' ),
						},
						{
							color: 'blue',
							icon: 'chart-line',
							title: __( 'Lift', 'altis-analytics' ),
							metric: getLift( variantsData.conversions / variantsData.views, originalData.conversions / originalData.views ),
							description: __( 'The aggregated lift of all variants versus the original.', 'altis-analytics' ),
						},
					] }
				/>
			</div>

			<Variants
				analytics={ analytics }
				append={ variant => {
					const result = test?.results[ variant.id ] || {};
					const pValue = result.p || 1;
					return (
						<li>
							<p className="description">{ __( 'Probability of best', 'altis-analytics' ) }</p>
							<div className="altis-analytics-block-variant__metric blue">{ compactMetric( ( 1 - pValue ) * 100 ) }</div>
						</li>
					);
				} }
				variants={ ( block && block.variants ) || null }
			/>

		</>
	);
};

export default BlockABTest;
