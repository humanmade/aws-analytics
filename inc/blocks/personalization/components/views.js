import React from 'react';

const { Icon } = wp.components;
const { __, _n, sprintf } = wp.i18n;

/**
 * Analytics views vs conversions display component.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {number} props.conversions Number of unique conversion.
 * @param {React.ReactNode} props.conversionsLabel Optional label component for conversion.
 * @param {boolean} props.isLoading Whether the data is loading.
 * @param {React.ReactNode} props.label Optional views label component.
 * @param {number} props.total Total views.
 * @param {number} props.uniques Total unique views.
 * @returns {React.ReactNode} The analytics data display component.
 */
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
				{ __( 'Loading...', 'altis-analytics' ) }
			</p>
		);
	}

	if ( ! uniques || ! total ) {
		return (
			<p className="altis-analytics-views">
				<Icon icon="visibility" />
				{ ' ' }
				{ __( 'No views yet', 'altis-analytics' ) }
			</p>
		);
	}

	return (
		<div className="altis-analytics-views">
			<div className="altis-analytics-views__total">
				<Icon icon="visibility" />
				{ label || sprintf( _n( '%d unique view, %d total', '%d unique views, %d total', uniques, 'altis-analytics' ), uniques, total ) }
			</div>
			{ conversions !== null && (
				<div className="altis-analytics-views__conversions">
					<Icon icon="yes" />
					{ conversionsLabel || sprintf( _n( '%d conversion', '%d conversions', conversions, 'altis-analytics' ), conversions ) }
					{ ' ' }
					({ ( ( conversions / uniques ) * 100 ).toFixed( 1 ) }%)
				</div>
			) }
		</div>
	);
};

export default Views;
