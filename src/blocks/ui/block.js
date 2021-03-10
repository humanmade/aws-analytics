import React, { useState } from 'react';
import styled from 'styled-components';

import Cards from './components/cards';
import DateRange from './components/date-range';

const { __, sprintf } = wp.i18n;
const { useSelect } = wp.data;

const BlockWrapper = styled.div`

`;

const Variants = styled.div`

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

	// Ensure we have some data.
	if ( ! clientId ) {
		return (
			<div className="message error">
				<p>{ __( 'Experience Block not found.' ) }</p>
			</div>
		);
	}

	if ( ! block ) {
		return (
			<BlockWrapper className="altis-analytics-block--loading">
				<h1>{ __( 'Experience Insights', 'altis-analytics' ) }</h1>
				<h2>{ __( 'Loading', 'altis-analytics' ) }</h2>
			</BlockWrapper>
		);
	}

	return (
		<BlockWrapper>
			<h1>{ __( 'Experience Insights', 'altis-analytics' ) }</h1>
			<h2>{ block.title.rendered }</h2>

			<DateRange ranges={ [ 7, 30, 90 ] } value={ days } onSetRange={ setDays } />

			<Cards
				cards={ [
					{
						icon: "",
						title: __( 'Block views', 'altis-analytics' ),
						metric: ( analytics && analytics.unique.views ) || null,
						description: __( 'Total number of times this block has been viewed by new visitors to the website' ),
					},
					{
						icon: "",
						title: __( 'Conversion rate', 'altis-analytics' ),
						metric: ( analytics && ( ( analytics.unique.conversions / analytics.unique.views ) * 100 ) ) || null,
						description: __( 'Average conversion of the block as a percentage of total unique views of the block' ),
					},
				] }
			/>

			<Variants>
				<h3>{ __( 'Block variants', 'altis-analytics' ) }</h3>
				{ block.variants.filter( variant => variant.fallback ).map( variant => {
					return (
						<div className="altis-analytics-block-variant">
							{ __( 'Fallback', 'altis-analytics' ) }
						</div>
					);
				} ) }
				{ block.variants.filter( variant => ! variant.fallback ).map( variant => {
					return (
						<div className="altis-analytics-block-variant">
							{ variant.audience.title }
						</div>
					);
				} ) }
			</Variants>

		</BlockWrapper>
	);
};

export default Block;
