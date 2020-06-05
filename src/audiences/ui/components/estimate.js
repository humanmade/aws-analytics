import React from 'react';
import { Sparklines, SparklinesLine } from 'react-sparklines';
import styled from 'styled-components';

import PieChart from './pie-chart';

const { useSelect } = wp.data;
const { __ } = wp.i18n;

const StyledEstimate = styled.div`
	display: flex;
	flex-wrap: wrap;
	margin: 0;

	.audience-estimate__title {
		flex: 0 0 100%;
		margin: 0 0 20px;
	}

	.audience-estimate__percentage {
		flex: 0 1 100px;
		margin-right: 20px;
		max-width: 5.5rem;
	}

	.audience-estimate__totals {
		flex: 2;
	}

	.audience-estimate__totals svg {
		max-width: 220px;
		margin-top: 5px;
		margin-bottom: 10px;
	}

	.audience-estimate__totals p {
		margin: 0;
	}

	.audience-estimate__totals strong {
		margin-right: 2px;
	}
`;

export default function Estimate( props ) {
	const {
		audience,
		sparkline,
		title,
	} = props;

	if ( ! audience ) {
		return null;
	}

	const estimate = useSelect( select => select( 'audience' ).getEstimate( audience ), [ audience ] );
	const percent = estimate.total ? Math.round( ( estimate.count / estimate.total ) * 100 ) : 0;

	return (
		<StyledEstimate className="audience-estimate" { ...props }>
			{ title && (
				<h3 className="audience-estimate__title">{ title }</h3>
			) }
			<PieChart
				className="audience-estimate__percentage"
				percent={ percent }
			/>
			<div className="audience-estimate__totals">
				{ sparkline && (
					<Sparklines
						className="audience-estimate__sparkline"
						data={ estimate.histogram.map( item => item.count ) }
						preserveAspectRatio="xMidYMid meet"
					>
						<SparklinesLine color="rgb(0, 124, 186)" style={ { strokeWidth: 5 } } />
					</Sparklines>
				) }
				<p className="audience-estimate__count">
					<strong>{ estimate.count }</strong>
					{ ' ' }
					<span>{ __( 'uniques in the last 7 days' ) }</span>
				</p>
			</div>
		</StyledEstimate>
	);
}

Estimate.defaultProps = {
	audience: null,
	sparkline: false,
	title: '',
};
