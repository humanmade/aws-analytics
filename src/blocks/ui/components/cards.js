import React from 'react';
import styled from 'styled-components';

const Container = styled.div`

`;

const Card = styled.div`

`;

/**
 * Analytics metric cards component.
 *
 * @param {object} props Component props.
 * @param {Array} props.cards The card configurations.
 * @returns {React.ReactNode} Cards component.
 */
export default function Cards( { cards = [] } ) {
	if ( cards.length === 0 ) {
		return null;
	}

	return (
		<Container className="altis-analytics-cards">
			{ cards.map( card => (
				<Card className="altis-analytics-card">
					<h3>{ card.title }</h3>
					<div className="altis-analytics-card__metric">{ card.metric }</div>
					<p>{ card.description }</p>
				</Card>
			) ) }
		</Container>
	);
}
