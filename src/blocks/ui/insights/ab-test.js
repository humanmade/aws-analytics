import React from 'react';
import { compactMetric, getLetter, getLift } from '../../../utils';
import { defaultVariantAnalytics } from '../../data/shapes';

import Cards from '../components/cards';
import Timeline from '../components/timeline';
import Variants from '../components/variants';

const { useSelect } = wp.data;
const { __, sprintf } = wp.i18n;

/**
 * Helper to get a variants title.
 *
 * @param {string} title The defined title if available.
 * @param {number} id The variant ID or index.
 * @returns {string} The variant title.
 */
const getABVariantTitle = ( title, id ) => title || sprintf( __( 'Variant %s', 'altis-analytics' ), getLetter( id ) );

/**
 * Personalized Content Block Analytics component.
 *
 * @param {object} props The component props.
 * @param {object} props.block The block post data.
 * @param {string} props.clientId The block client ID.
 * @returns {React.ReactNode} The block view component.
 */
const ABTest = ( {
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
		if ( parseInt( index, 10 ) === 0 ) {
			return carry;
		}

		carry.loads += variant.unique.loads;
		carry.views += variant.unique.views;
		carry.conversions += variant.unique.conversions;
		return carry;
	}, defaultVariantAnalytics.unique );

	// Probability to be best.
	const maxRate = ( test?.results?.variants || [] ).reduce( ( carry, variant ) => {
		return variant.rate > carry ? variant.rate : carry;
	}, 0 );

	// Check end status of test.
	const hasEnded = ( test?.end_time && test?.end_time <= Date.now() ) || Number.isInteger( test?.results?.winner );
	const winningVariantId = Number.isInteger( test?.results?.winner ) ? test?.results?.winner : false;
	const winningVariant = ( winningVariantId !== false && block?.variants[ winningVariantId ] ) || false;
	const winningVariantData = ( winningVariantId !== false && analytics?.variants && analytics?.variants[ winningVariantId ]?.unique ) || false;

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

			{ hasEnded && (
				<div className="altis-analytics-conclusion">
					<h2>{ __( 'Conclusion', 'altis-analytics' ) }</h2>
					{ winningVariantId === 0 && (
						<>
							<p>{ sprintf(
								__( '%s is the winner!', 'altis-analytics' ),
								getABVariantTitle( winningVariant.title, 0 )
							) }</p>
							<p>{ sprintf(
								__( 'Conversion rate: %s, the original version is the best.', 'altis-analytics' ),
								compactMetric( ( winningVariantData.conversions / winningVariantData.views ) * 100 )
							) }</p>
						</>
					) }
					{ winningVariantId !== 0 && (
						<>
							<p>{ sprintf(
								__( '%s is the winner!', 'altis-analytics' ),
								getABVariantTitle( winningVariant.title, winningVariantId )
							) }</p>
							<p>{ sprintf(
								__( 'The conversion rate was %s, %s higher than the original.', 'altis-analytics' ),
								compactMetric( ( winningVariantData.conversions / winningVariantData.views ) * 100 ),
								compactMetric( getLift( winningVariantData.conversions / winningVariantData.views, originalData.conversions / originalData.views ) )
							) }</p>
						</>
					) }
					{ winningVariantId === false && (
						<>
							<p>{ __( 'No clear winner was found.', 'altis-analytics' ) }</p>
							<p>{ __( 'There were no statistically significant differences in the conversion rate between the variants.', 'altis-analytics' ) }</p>
						</>
					) }
				</div>
			) }

			<Variants
				analytics={ analytics }
				append={ ( { variant } ) => {
					const result = test?.results?.variants[ variant.id ] || {};
					const pValue = result.p || 1;
					const relativeRate = result.rate / maxRate;
					const p2bb = relativeRate * ( 1 - pValue );
					return (
						<li>
							<p className="description">{ __( 'Probability of best', 'altis-analytics' ) }</p>
							<div className="altis-analytics-block-variant__metric blue">{ compactMetric( p2bb * 100 ) }</div>
						</li>
					);
				} }
				variants={ ( block && block.variants ) || null }
			/>

		</>
	);
};

export default ABTest;
