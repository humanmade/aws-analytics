import React from 'react';
import PropTypes from 'prop-types';

import { compactMetric, formatNumber } from '../../../utils';
import { defaultVariantAnalytics } from '../../data/shapes';

import Lift from './lift';
import VariantsList from './variants-list';

const { decodeEntities } = wp.htmlEntities;
const { __ } = wp.i18n;

/**
 * Show Personalized Content block variant data.
 *
 * @param {object} props The component props.
 * @returns {React.ReactNode} The variants display component.
 */
function Variants( props ) {
	const {
		analytics,
		append,
		variants,
	} = props;

	if ( ! variants ) {
		return null;
	}

	const fallback = ( variants && variants.find( variant => variant.fallback ) ) || {};
	const fallbackData = analytics ? ( analytics.variants.find( variant => variant.id === 0 ) || defaultVariantAnalytics ) : null;

	return (
		<VariantsList>
			{ variants.map( variant => {
				const data = ( analytics && analytics.variants.find( v => v.id === variant.id || 0 ) ) || defaultVariantAnalytics;
				return (
					<div className={ `altis-analytics-block-variant ${ variant.fallback ? 'altis-analytics-block-variant--fallback' : '' }` }>
						<div className="altis-analytics-block-variant__header">
							<h3>{ decodeEntities( ! variant.title && variant.fallback ? __( 'Fallback', 'altis-analytics' ) : variant.title ) }</h3>
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
							{ append && append( {
								data,
								variant,
							} ) }
						</ul>
					</div>
				);
			} ) }
		</VariantsList>
	);
}

Variants.defaultProps = {
	analytics: null,
	append: null,
	variants: [],
};

Variants.propTypes = {
	analytics: PropTypes.object,
	append: PropTypes.func,
	variants: PropTypes.array,
};

export default Variants;
