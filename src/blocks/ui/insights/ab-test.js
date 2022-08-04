import React from 'react';

import { compactMetric, getLetter, getLift } from '../../../utils';
import { defaultABVariant } from '../../data/shapes';
import Cards from '../components/cards';
import Timeline from '../components/timeline';
import Variants from '../components/variants';

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
 * @returns {React.ReactNode} The block view component.
 */
const ABTest = ( {
	block,
} ) => {
	const test = block.ab_tests?.xb;

	// Calculate aggregated data sets for comparison.
	const originalData = ( test?.results?.variants && test?.results?.variants[0] ) || defaultABVariant;
	const variantsData = ( test?.results?.variants || [] ).reduce( ( carry, variant, index ) => {
		if ( parseInt( index, 10 ) === 0 ) {
			return carry;
		}

		carry.size += variant.size;
		carry.hits += variant.hits;
		carry.rate = carry.size > 0 ? carry.hits / carry.size : 0;
		return carry;
	}, { ...defaultABVariant } );
	const aggregateData = {
		size: originalData.size + variantsData.size,
		hits: originalData.hits + variantsData.hits,
	};
	aggregateData.rate = aggregateData.size > 0 ? aggregateData.hits / aggregateData.size : 0;

	// Probability to be best.
	const maxRate = ( test?.results?.variants || [] ).reduce( ( carry, variant ) => {
		return variant.rate > carry ? variant.rate : carry;
	}, 0 );

	// Check end status of test.
	const hasEnded = ( test?.end_time && test?.end_time <= Date.now() ) || Number.isInteger( test?.results?.winner );
	const winningVariantId = Number.isInteger( test?.results?.winner ) ? test?.results?.winner : false;
	const winningVariant = ( winningVariantId !== false && block?.variants[ winningVariantId ] ) || false;
	const winningVariantData = ( winningVariantId !== false && test?.results?.variants && test?.results?.variants[ winningVariantId ] ) || false;

	// Create analytics data object from stored aggregated A/B test data
	// as we might not have any dynamic stats from the last 90 days.
	const analytics = {
		views: aggregateData.size,
		conversions: aggregateData.hits,
		variants: ( test?.results?.variants || [] ).map( ( variant, index ) => {
			return {
				id: index,
				views: variant.size,
				conversions: variant.hits,
				unique: {
					views: variant.size,
					conversions: variant.hits,
				},
			};
		} ),
	};

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
							metric: aggregateData.size,
							description: __( 'Total number of times this block has been viewed.', 'altis-analytics' ),
						},
						{
							color: 'green',
							icon: 'thumbs-up',
							title: __( 'Conversion Rate', 'altis-analytics' ),
							metric: aggregateData.size > 0 ? ( aggregateData.rate * 100 ) : null,
							description: aggregateData.hits && aggregateData.hits === 0
								? __( 'There are no conversions recorded yet, you may need to choose a conversion goal other than impressions for your variants.' )
								: __( 'Average conversion rate of the block as a percentage of total views of the block.', 'altis-analytics' ),
						},
						{
							color: 'blue',
							icon: 'chart-line',
							title: __( 'Lift', 'altis-analytics' ),
							metric: getLift( variantsData.rate, originalData.rate ),
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
								compactMetric( winningVariantData.rate * 100 )
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
								compactMetric( winningVariantData.rate * 100 ),
								compactMetric( getLift( winningVariantData.rate, originalData.rate ) )
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
				showUnique={ false }
				variants={ ( block && block.variants ) || null }
			/>

		</>
	);
};

export default ABTest;
