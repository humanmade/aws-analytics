import React from 'react';

const { Icon } = wp.components;
const { __, _n, sprintf } = wp.i18n;

const Views = ( {
	conversions = null,
	conversionsLabel = null,
	isLoading,
	label = null,
	total,
	uniques,
} ) => {
	if ( ( ! uniques || ! total ) && isLoading ) {
		return (
			<p className="altis-analytics-views">
				<Icon icon="visibility" />
				{ ' ' }
				{ __( 'Loading...', 'altis-experiments' ) }
			</p>
		);
	}

	if ( ! uniques || ! total ) {
		return (
			<p className="altis-analytics-views">
				<Icon icon="visibility" />
				{ ' ' }
				{ __( 'No views yet', 'altis-experiments' ) }
			</p>
		);
	}

	return (
		<div className="altis-analytics-views">
			<div className="altis-analytics-views__total">
				<Icon icon="visibility" />
				{ label || sprintf( _n( '%d unique view, %d total', '%d unique views, %d total', uniques, 'altis-experiments' ), uniques, total ) }
			</div>
			{ conversions !== null && (
				<div className="altis-analytics-views__conversions">
					<Icon icon="yes" />
					{ conversionsLabel || sprintf( _n( '%d conversion', '%d conversions', conversions, 'altis-experiments' ), conversions ) }
					{ ' ' }
					({ ( ( conversions / uniques ) * 100 ).toFixed( 1 ) }%)
				</div>
			) }
		</div>
	);
};

export default Views;
