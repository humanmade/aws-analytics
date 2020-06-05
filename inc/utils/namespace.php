<?php
/**
 * Helper functions for stats and significance.
 */

namespace Altis\Analytics\Utils;

use Altis\Analytics;

/**
 * Return asset file name based on generated manifest.json file.
 *
 * @param string $filename The webpack entry point file name.
 * @return string|false The real URL of the asset or false if it couldn't be found.
 */
function get_asset_url( string $filename ) {
	$manifest_file = Analytics\ROOT_DIR . '/build/manifest.json';

	if ( ! file_exists( $manifest_file ) ) {
		return false;
	}

	// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$manifest = file_get_contents( $manifest_file );
	$manifest = json_decode( $manifest, true );

	if ( ! $manifest || ! isset( $manifest[ $filename ] ) ) {
		return false;
	}

	$path = $manifest[ $filename ];

	if ( strpos( $path, 'http' ) !== false ) {
		return $path;
	}

	return plugins_url( $manifest[ $filename ], Analytics\ROOT_DIR . '/build/assets' );
}

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
	$g = count( $means );
	if ( $g !== count( $stddevs ) ) {
		trigger_error( 'inconsistent list lengths', E_USER_WARNING );
		return 0.0;
	}
	if ( $g !== count( $group_counts ) ) {
		trigger_error( 'wrong nCounts list length', E_USER_WARNING );
		return 0.0;
	}

	// Calculate total number of samples, N, and grand mean, GM.
	$n = array_sum( $group_counts ); // Total number of samples.
	if ( $n <= 1 ) {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		trigger_error( "Warning: only {$n} samples, SD is incalculable", E_USER_WARNING );
	}
	$gm = 0.0;
	for ( $i = 0; $i < $g; $i++ ) {
		$gm += $means[ $i ] * $group_counts[ $i ];
	}
	$gm /= $n;  // Grand mean.

	// Calculate Error Sum of Squares.
	$ess = 0.0;
	for ( $i = 0; $i < $g; $i++ ) {
		$ess += ( pow( $stddevs[ $i ], 2 ) ) * ( $group_counts[ $i ] - 1 );
	}

	// Calculate Total Group Sum of Squares.
	$tgss = 0.0;
	for ( $i = 0; $i < $g; $i++ ) {
		$tgss += ( pow( $means[ $i ] - $gm, 2 ) ) * $group_counts[ $i ];
	}

	// Calculate standard deviation as square root of grand variance.
	$result = sqrt( ( $ess + $tgss ) / ( $n - 1 ) );
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
 * @param string $path The endpoint to query against, defaults to _search.
 * @return array|null
 */
function query( array $query, array $params = [], string $path = '_search' ) : ?array {

	// Sanitize path.
	$path = trim( $path, '/' );

	// Get URL.
	$url = add_query_arg( $params, get_elasticsearch_url() . '/analytics*/' . $path );

	// Escape the URL to ensure nothing strange was passed in via $path.
	$url = esc_url_raw( $url );

	$response = wp_remote_post( $url, [
		'headers' => [
			'Content-Type' => 'application/json',
		],
		'body' => wp_json_encode( $query, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ),
	] );

	if ( wp_remote_retrieve_response_code( $response ) !== 200 || is_wp_error( $response ) ) {
		if ( is_wp_error( $response ) ) {
			trigger_error(
				sprintf(
					"Analytics: elasticsearch query failed:\n%s\n%s",
					esc_url( $url ),
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					$response->get_error_message()
				),
				E_USER_WARNING
			);
		} else {
			trigger_error(
				sprintf(
					"Analytics: elasticsearch query failed:\n%s\n%s\n%s",
					esc_url( $url ),
					wp_json_encode( $query ),
					// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					wp_remote_retrieve_body( $response )
				),
				E_USER_WARNING
			);
		}
		return null;
	}

	$json = wp_remote_retrieve_body( $response );
	$result = json_decode( $json, true );

	if ( json_last_error() ) {
		trigger_error( 'Analytics: elasticsearch response could not be decoded.', E_USER_WARNING );
		return null;
	}

	// Enable logging for analytics queries.
	if ( defined( 'ALTIS_ANALYTICS_LOG_QUERIES' ) && ALTIS_ANALYTICS_LOG_QUERIES ) {
		error_log(
			sprintf(
				"Analytics: elasticsearch query:\n%s\n%s\n%s",
				$url,
				wp_json_encode( $query ),
				wp_remote_retrieve_body( $response )
			)
		);
	}

	return $result;
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
 * @todo work out how to merge percentiles & percentile ranks.
 *
 * @param array $current Current aggregate results.
 * @param array $new Updated aggregate results.
 * @param string $bucket_type The type of aggregation.
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

/**
 * Determine type of Elasticsearch field by name.
 *
 * @param string $field The full field name.
 * @return string|null $type One of 'string', 'number' or 'date'.
 */
function get_field_type( string $field ) : ?string {
	if ( empty( $field ) ) {
		return null;
	}

	$numeric_fields = [
		'event_timestamp',
		'arrival_timestamp',
		'session.start_timestamp',
		'session.stop_timestamp',
	];

	$is_numeric_field = in_array( $field, $numeric_fields, true );
	$is_metric = stripos( $field, 'metrics' ) !== false;

	if ( $is_numeric_field || $is_metric ) {
		return 'number';
	}

	$date_fields = [
		'endpoint.CreationDate',
		'endpoint.EffectiveDate',
	];

	if ( in_array( $field, $date_fields, true ) ) {
		return 'date';
	}

	return 'string';
}
