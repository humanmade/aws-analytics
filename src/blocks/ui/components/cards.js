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

	display: flex;
	flex-wrap: wrap;
	align-items: baseline;

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

	.altis-analytics-card__metric {
		margin: 20px 0;
		font-size: 38px;
		line-height: 38px;
		font-weight: bold;
		flex: 2;
	}

	.altis-analytics-card__lift {
		margin: 20px 0;
		font-size: 24px;
		line-height: 38px;
		font-weight: bold;
		flex: 1;
		text-align: right;

		span {
			font-size: 18px;
		}

		&--up {
			color: #3FCF8E;
		}
		&--down {
			color: #ED7B9D;
		}
	}

	&.yellow .dashicon {
		color: #F8DA6D;
		background: rgba(248, 218, 109, .3);
	}
	&.green .dashicon {
		color: #3FCF8E;
		background: rgba(63, 207, 142, .3);
	}
	&.blue .dashicon {
		color: #4767df;
		background: rgba(67, 108, 255, .3);
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
					<div className="altis-analytics-card__metric">{ card.metric ? compactMetric( card.metric ) : '…' }</div>
					{ card.lift && (
						<Lift className="altis-analytics-card__lift" { ...card.lift } />
					) }
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
