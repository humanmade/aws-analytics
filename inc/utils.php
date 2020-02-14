<?php
/**
 * Helper functions for stats and significance.
 */

namespace Altis\Analytics\Utils;
use function Altis\get_config;

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
	$url = '';

	if ( defined( 'ALTIS_ANALYTICS_ELASTICSEARCH_URL' ) ) {
		$url = ALTIS_ANALYTICS_ELASTICSEARCH_URL;
	}

	/**
	 * Filter the elasticsearch URL for use with analytics.
	 *
	 * @param string $url Elasticsearch Server URL.
	 */
	$url = apply_filters( 'altis.analytics.elasticsearch.url', $url );

	return $url;
}

/**
 * Query Analytics data in Elasticsearch.
 *
 * @param array $query A full elasticsearch Query DSL array.
 * @param array $params URL query parameters to append to request URL.
 * @return array|null
 */
function query( array $query, array $params = [] ) : ?array {

	// Get URL.
	$url = add_query_arg( $params, get_elasticsearch_url() . '/analytics*/_search' );

	$response = wp_remote_post( $url, [
		'headers' => [
			'Content-Type' => 'application/json',
		],
		'body' => json_encode( $query, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ),
	] );

	if ( wp_remote_retrieve_response_code( $response ) !== 200 || is_wp_error( $response ) ) {
		if ( is_wp_error( $response ) ) {
			trigger_error( sprintf(
				"Analytics: elasticsearch query failed: %s",
				$response->get_error_message()
			), E_USER_WARNING );
		} else {
			trigger_error( sprintf(
				"Analytics: elasticsearch query failed:\n%s\n%s",
				json_encode( $query ),
				wp_remote_retrieve_body( $response )
			), E_USER_WARNING );
		}
		return null;
	}

	$json = wp_remote_retrieve_body( $response );
	$result = json_decode( $json, true );

	if ( json_last_error() ) {
		trigger_error( 'Analytics: elasticsearch response could not be decoded.', E_USER_WARNING );
		return null;
	}

	return $result;
}

/**
 * Delete old Analytics indexes in Elasticsearch.
 *
 * @return array|null
 */
function delete_old_indexes() : ?array {
	// Index age in days.
	$duration = get_config()['modules']['analytics']['max_index_age'] ?? 7;

	// Get index name by date. 
	$date = new \DateTime();
	$date->sub( new \DateInterval( 'P'. $duration . 'D' ) );
	$index_date = ( $date->format('Y-m-d') ); 
	$index = 'analytics-' .  $index_date;

	// Get URL.
	$url = add_query_arg( [], get_elasticsearch_url() . '/' . $index . '/' );

	$response = wp_remote_request( $url, [
		'method' => 'DELETE',
	] );

	// Check for failures.
	if ( wp_remote_retrieve_response_code( $response ) !== 200 || is_wp_error( $response ) ) {
		if ( is_wp_error( $response ) ) {
			trigger_error( sprintf(
				"Analytics: ES index deletion failed: %s",
				$response->get_error_message()
			), E_USER_WARNING );
		} else {
			trigger_error( sprintf(
				"Analytics: ES index deletion failed:\n%s\n%s",
				json_encode( $index ),
				wp_remote_retrieve_body( $response )
			), E_USER_WARNING );
		}
		return null;
	}

	$json = wp_remote_retrieve_body( $response );
	$result = json_decode( $json, true );

	if ( json_last_error() ) {
		trigger_error( 'Analytics: ES deletion response could not be decoded.', E_USER_WARNING );
		return null;
	}

	return $result;
}

add_action( 'index_maintenance', 'delete_old_indexes' );

// Schedule index maintenance daily.
if( !wp_next_scheduled( __NAMESPACE__ . '\\index_maintenance' ) ) {
	wp_schedule_event( time(), 'daily',  __NAMESPACE__ . '\\index_maintenance' );
}

/**
 * Get actual milliseconds value as integer.
 *
 * @return int Milliseconds since unix epoch.
 */
function milliseconds() : int {
	return (int) microtime( true ) * 1000;
}

/**
 * Merge aggregations from ES results.
 *
 *
 * @todo work out how to merge percentiles & percentile ranks.
 *
 * @param array $current
 * @param array $new
 * @return array
 */
function merge_aggregates( array $current, array $new, string $bucket_type = '' ) : array {
	$merged = $current;

	foreach ( $new as $key => $value ) {
		if ( is_string( $key ) ) {
			// Get bucket type.
			if ( preg_match( '/^([a-z0-9_-]+)#.*$/', $key, $matches ) ) {
				$bucket_type = $matches[1];
			}

			switch ( $key ) {
				case 'doc_count':
				case 'sum':
				case 'count':
					$merged[ $key ] = ( $current[ $key ] ?? 0 ) + $value;
					break;
				case 'value':
					if ( $bucket_type ) {
						switch ( $bucket_type ) {
							case 'cardinality':
							case 'cumulative_sum':
							case 'sum':
							case 'sum_bucket':
							case 'value_count':
								$merged[ $key ] = ( $current[ $key ] ?? 0 ) + $value;
								break;
							case 'avg':
							case 'avg_bucket':
								$merged[ $key ] = ( ( $current[ $key ] ?? 0 ) + $value ) / 2;
								break;
							case 'min':
							case 'min_bucket':
								$merged[ $key ] = min( $current[ $key ] ?? PHP_INT_MAX, $value );
								break;
							case 'max':
							case 'max_bucket':
								$merged[ $key ] = max( $current[ $key ] ?? PHP_INT_MIN, $value );
								break;
							default:
								$merged[ $key ] = $current[ $key ] ?? 0;
								break;
						}
						// Reset bucket type.
						$bucket_type = '';
					} else {
						$merged[ $key ] = ( $current[ $key ] ?? 0 ) + $value;
					}
					break;
				case 'avg':
					$merged[ $key ] = ( ( $current[ $key ] ?? 0 ) + $value ) / 2;
					break;
				case 'min':
					$merged[ $key ] = min( $current[ $key ] ?? PHP_INT_MAX, $value );
					break;
				case 'max':
					$merged[ $key ] = max( $current[ $key ] ?? PHP_INT_MIN, $value );
					break;
				case 'std_deviation':
					// Calculate composite std dev.
					if ( isset( $new['avg'], $new['count'], $current['std_deviation'], $current['avg'], $current['count'] ) ) {
						$merged[ $key ] = composite_stddev(
							[ $new['avg'], $current['avg'] ],
							[ $value, $current[ $key ] ],
							[ $new['count'], $current['count'] ]
						);
					} else {
						$merged[ $key ] = $value;
					}
					break;
				default:
					$merged[ $key ] = $value;
					break;
			}
		}

		if ( is_array( $value ) ) {
			$merged[ $key ] = merge_aggregates( $current[ $key ] ?? [], $value, $bucket_type );
		}
	}

	return $merged;
}
