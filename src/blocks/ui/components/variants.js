import React from 'react';
import styled from 'styled-components';

import { compactMetric, formatNumber } from '../../../utils';
import { defaultVariantAnalytics } from '../../data/shapes';

import Lift from './lift';

const { __ } = wp.i18n;

const VariantsList = styled.div`
	padding-bottom: 30px;

	& h2 {
		color: #4767df;
	}

	.altis-analytics-block-variant {
		margin: 30px 0 40px;

		&--fallback {
			margin-bottom: 20px;
			border-bottom: 1px solid rgba( 0, 0, 0, .2 );
			padding-bottom: 20px;
		}
	}

	ul {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		margin: 10px 0 0;
		padding: 0;
	}

	li {
		margin-right: 40px;
		margin-top: 10px;
		display: flex;
		flex-direction: column-reverse;
	}

	h3, p {
		margin: 0;
	}

	h3 {
		margin-right: 40px;
	}

	li .description {
		text-transform: uppercase;
	}

	.altis-analytics-block-variant__metric {
		font-size: 24px;
		font-weight: bold;
		margin-bottom: 5px;
	}

	.audience-estimate svg {
		max-height: 30px;
	}

	.blue {
		color: #4767df;
	}
`;

/**
 * Show experience block variant data.
 *
 * @param {object} props The component props.
 * @returns {React.ReactNode} The variants display component.
 */
function Variants( props ) {
	const {
		analytics,
		variants,
	} = props;

	if ( ! variants ) {
		return null;
	}

	const fallback = ( variants && variants.find( variant => variant.fallback ) ) || {};
	const fallbackData = analytics ? ( analytics.audiences.find( audience => audience.id === 0 ) || defaultVariantAnalytics ) : null;

	return (
		<VariantsList>
			<h2>{ __( 'Block Variants', 'altis-analytics' ) }</h2>
			{ variants.map( variant => {
				const data = ( analytics && analytics.audiences.find( audience => audience.id === ( variant.audience && variant.audience.id ) || 0 ) ) || defaultVariantAnalytics;
				return (
					<div className={ `altis-analytics-block-variant ${ variant.fallback ? 'altis-analytics-block-variant--fallback' : '' }` }>
						<div className="altis-analytics-block-variant__header">
							<h3>{ variant.fallback ? __( 'Fallback', 'altis-analytics' ) : variant.audience.title }</h3>
							{ variant.goal && ( <p className="description">{ __( 'Goal', 'altis-analytics' ) }: <strong>{ window.Altis.Analytics.Experiments.Goals[ variant.goal ].label }</strong></p> ) }
						</div>
						<ul>
							<li>
								<p className="description">{ __( 'Total views', 'altis-analytics' ) }</p>
								<div className="altis-analytics-block-variant__metric">{ data ? formatNumber( data.views ) : '…' }</div>
							</li>
							<li>
								<p className="description">{ __( 'Unique views', 'altis-analytics' ) }</p>
								<div className="altis-analytics-block-variant__metric">{ data ? formatNumber( data.unique.views ) : '…' }</div>
							</li>
							{ variant.goal && (
								<>
									<li>
										<p className="description">{ __( 'Conversion rate', 'altis-analytics' ) }</p>
										<div className="altis-analytics-block-variant__metric">{ data ? compactMetric( ( data.unique.conversions / data.unique.views ) * 100 ) : '…' }</div>
									</li>
									{ ! variant.fallback && fallback.goal && fallbackData && (
										<li>
											<p className="description">{ __( 'Lift vs. fallback', 'altis-analytics' ) }</p>
											<Lift
												className="altis-analytics-block-variant__metric"
												current={ data.unique.conversions / data.unique.views }
												previous={ fallbackData.unique.conversions / fallbackData.unique.views }
											/>
										</li>
									) }
								</>
							) }
							{ ! variant.fallback && (
								<li>
									<p className="description">{ __( 'Audience coverage', 'altis-analytics' ) }</p>
									<div className="altis-analytics-block-variant__metric blue">{ ( analytics && data ) ? compactMetric( ( data.unique.views / analytics.unique.views ) * 100 ) : '…' }</div>
								</li>
							) }
						</ul>
					</div>
				);
			} ) }
		</VariantsList>
	);
}

Variants.defaultProps = {
	analytics: null,
	variants: [],
};

export default Variants;
