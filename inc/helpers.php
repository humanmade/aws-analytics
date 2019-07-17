<?php
/**
 * Helper functions for stats and significance.
 */

namespace HM\Analytics\Helpers;

/**
 * Calculate the combined standard deviation for multiple groups of
 * averages, standard deviations and sizes.
 *
 * @param array $means Array of averages.
 * @param array $stddevs Array of standard deviations.
 * @param array $group_counts Array of sample sizes.
 * @return float
 */
function composite_stddev( array $means, array $stddevs, array $group_counts ) : float {
	// Number of groups.
	$G = count( $means );
	if ( $G != count( $stddevs ) ) {
		trigger_error( 'inconsistent list lengths', E_USER_WARNING );
		return 0.0;
	}
	if ( $G != count( $group_counts ) ) {
		trigger_error( 'wrong nCounts list length', E_USER_WARNING );
		return 0.0;
	}

	// Calculate total number of samples, N, and grand mean, GM.
	$N = array_sum( $group_counts ); // Total number of samples.
	if ( $N <= 1 ) {
		trigger_error( "Warning: only $N samples, SD is incalculable", E_USER_WARNING );
	}
	$GM = 0.0;
	for ( $i = 0; $i < $G; $i++ ) {
		$GM += $means[ $i ] * $group_counts[ $i ];
	}
	$GM /= $N;  // Grand mean.

	// Calculate Error Sum of Squares.
	$ESS = 0.0;
	for ( $i = 0; $i < $G; $i++ ) {
		$ESS += ( pow( $stddevs[ $i ], 2 ) ) * ( $group_counts[ $i ] - 1 );
	}

	// Calculate Total Group Sum of Squares.
	$TGSS = 0.0;
	for ( $i = 0; $i < $G; $i++ ) {
		$TGSS += ( pow( $means[ $i ] - $GM, 2 ) ) * $group_counts[ $i ];
	}

	// Calculate standard deviation as square root of grand variance.
	$result = sqrt( ( $ESS + $TGSS ) / ( $N - 1 ) );
	return $result;
}

/**
 * Return the Elasticsearhc instance URL.
 *
 * @return string
 */
function get_elasticsearch_url() : string {
	if ( defined( 'HM_ANALYTICS_ELASTICSEARCH_URL' ) ) {
		return HM_ANALYTICS_ELASTICSEARCH_URL;
	}

	/**
	 * Filter the elasticsearch URL for use with analytics.
	 *
	 * @param string $url
	 */
	$url = apply_filters( 'hm.analytics.elasticsearch.url', '' );

	return $url;
}
