import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import Cards from './components/cards';

const { __ } = wp.i18n;
const { withSelect } = wp.data;


const BlockWrapper = styled.div`

`;

const Variants = styled.div`

`;


// Data needed
// - post
// - views data for time range
// - full available time range
// -

const Block = ( {
	postId,
	post,
	variants,
} ) => {


	const [ dateRange, setDateRange ] = useState( 7 );


	// Ensure we have some data.
	if ( ! postId ) {
		return (
			<div className="messge error">
				<p>{ __( 'Experience Block not found.' ) }</p>
			</div>
		);
	}

	return (
		<BlockWrapper>
			<h1>{ __( 'Experience Insights', 'altis-analytics' ) }</h1>
			<h2>{ post.title.rendered }</h2>

			<nav>
				<button onClick={ () => setDateRange( 7 ) }>{ __( '7 days', 'altis-analytics' ) }</button>
				<button onClick={ () => setDateRange( 30 ) }>{ __( '30 days', 'altis-analytics' ) }</button>
				<button onClick={ () => setDateRange( 90 ) }>{ __( '90 days', 'altis-analytics' ) }</button>
			</nav>

			<Cards
				cards={ [
					{
						icon: "",
						title: __( 'Block views', 'altis-analytics' ),
						metric: 200000,
						description: __( 'Total number of times this block has been viewed by new visitors to the website' ),
					},
					{
						icon: "",
						title: __( 'Conversion rate', 'altis-analytics' ),
						metric: 6000,
						description: __( 'Average conversion of the block as a percentage of total unique views of the block' ),
					},
				] }
			/>

			<Variants>
				{ variants.map( variant => {

					return (
						<div className="altis-analytics-block-variant">
							variant
						</div>
					);
				} ) }
			</Variants>

		</BlockWrapper>
	);
};

export default withSelect( ( select, props ) => {

	const post = select( 'core/data' ).getPost( props.postId );

	return {
		post,
	};
} )( Block );
