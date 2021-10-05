import React from 'react';
import styled from 'styled-components';

import { compactMetric } from '../../../utils';

import Lift from './lift';

const { Icon } = wp.components;

const Container = styled.div`
	display: flex;
	margin: 0 -20px;
`;

const Card = styled.div`
	flex: 1;
	margin: 20px;
	padding: 20px;
	background: #fff;
	box-shadow: 0 3px 6px rgba( 0, 0, 0, .3 );
	border-radius: 2px;

	h3, p {
		margin: 0;
		flex: none;
		width: 100%;
	}
	h3 {
		margin-bottom: 10px;
	}

	.dashicon {
		margin-top: -6px;
		margin-right: 4px;
		border-radius: 100px;
		padding: 5px;
		text-align: center;
	}

	.altis-analytics-card__metrics {
		display: flex;
		align-items: baseline;
	}

	.altis-analytics-card__metric {
		margin: 20px 0;
		font-size: 38px;
		line-height: 38px;
		font-weight: bold;
		flex: 2;
	}

	.altis-analytics-card__lift {
		margin: 20px 0 0;
		font-size: 24px;
		line-height: 38px;
		font-weight: bold;
		flex: 1;
		text-align: right;
	}

	&.yellow .dashicon {
		color: #EFBD0B;
		background: rgba(248, 218, 109, .2);
	}
	&.green .dashicon {
		color: #3FCF8E;
		background: rgba(63, 207, 142, .2);
	}
	&.blue .dashicon {
		color: #4767df;
		background: rgba(67, 108, 255, .2);
	}
	&.blue .altis-analytics-card__metric {
		color: #4767df;
	}
`;

/**
 * Analytics metric cards component.
 *
 * @param {object} props Component props.
 * @param {Array} props.cards The card configurations.
 * @returns {React.ReactNode} Cards component.
 */
function Cards( { cards = [] } ) {
	if ( cards.length === 0 ) {
		return null;
	}

	return (
		<Container className="altis-analytics-cards">
			{ cards.map( card => (
				<Card className={ [ 'altis-analytics-card', card.color ].join( ' ' ) }>
					<h3>{ card.icon && <Icon icon={ card.icon } /> } { card.title }</h3>
					<div className="altis-analytics-card__metrics">
						<div className="altis-analytics-card__metric">{ card.metric !== null ? compactMetric( card.metric ) : '…' }</div>
						{ card.lift && (
							<Lift className="altis-analytics-card__lift" { ...card.lift } />
						) }
					</div>
					<p className="description">{ card.description }</p>
				</Card>
			) ) }
		</Container>
	);
}

Cards.defaultProps = {
	title: '',
	color: '',
	icon: null,
	metric: null,
	lift: null,
	description: '',
};

export default Cards;
