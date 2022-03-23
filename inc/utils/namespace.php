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
 * Retrieve the elasticsearch version.
 *
 * Return the version string if found otherwise 'unknown'.
 *
 * @return string|null
 */
function get_elasticsearch_version() : ?string {
	if ( defined( 'ELASTICSEARCH_VERSION' ) ) {
		return ELASTICSEARCH_VERSION;
	}

	$version = wp_cache_get( 'elasticsearch-version' );
	if ( ! empty( $version ) ) {
		return $version;
	}

	$response = wp_remote_get( get_elasticsearch_url() );

	if ( wp_remote_retrieve_response_code( $response ) !== 200 || is_wp_error( $response ) ) {
		return null;
	}

	$json = wp_remote_retrieve_body( $response );
	$result = json_decode( $json, true );
	$version = $result['version']['number'] ?? 'unknown';

	// Cache for a long time as it's not going to be changing particularly often.
	wp_cache_set( 'elasticsearch-version', $version, '', DAY_IN_SECONDS );

	return $version;
}

/**
 * Query Analytics data in Elasticsearch.
 *
 * @param array $query A full elasticsearch Query DSL array.
 * @param array $params URL query parameters to append to request URL.
 * @param string $path The endpoint to query against, defaults to _search.
 * @param string $method The HTTP request method to use.
 * @return array|null
 */
function query( array $query, array $params = [], string $path = '_search', string $method = 'POST' ) : ?array {
	// Sanitize path.
	$path = trim( $path, '/' );

	// Get URL.
	$url = add_query_arg( $params, get_elasticsearch_url() . '/analytics*/' . $path );

	// Escape the URL to ensure nothing strange was passed in via $path.
	$url = esc_url_raw( $url );

	$request_args = [
		'method' => $method,
		'headers' => [
			'Content-Type' => 'application/json',
		],
		'timeout' => 15,
	];

	// Only attach the body if the method supports it.
	if ( in_array( $method, [ 'POST', 'PUT', 'PATCH', 'DELETE' ], true ) ) {
		$request_args['body'] = wp_json_encode( $query, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE );
	}

	// Get the data!
	$response = wp_remote_request( $url, $request_args );

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
 * Get a point in time in milliseconds, optionally rounded to the nearest time block.
 *
 * @param string $point_in_time strtotime-safe string, eg: '-1 week'
 * @param integer $round_to Round the result to the nearest time block in seconds, eg: HOUR_IN_SECONDS.
 *
 * @return integer|null
 */
function date_in_milliseconds( string $point_in_time, int $round_to = 0 ) : ?int {
	$since_epoch = strtotime( $point_in_time );

	if ( ! $since_epoch ) {
		trigger_error( sprintf( 'Analytics: Point in time string "%s" cannot be resolved.', $point_in_time ), E_USER_WARNING );
		return null;
	}

	// Round if needed.
	if ( $round_to ) {
		$since_epoch = floor( $since_epoch / $round_to ) * $round_to;
	}

	// Convert to milliseconds.
	return $since_epoch * 1000;
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

/**
 * Flattens an array recursively and sets the keys for nested values
 * as a dot separated path.
 *
 * @param array $data The array to flatten.
 * @param string $prefix The current key prefix.
 * @return array
 */
function flatten_array( array $data, string $prefix = '' ) : array {
	$flattened = [];
	$prefix = ! empty( $prefix ) ? "{$prefix}." : '';

	foreach ( $data as $key => $value ) {
		if ( is_array( $value ) ) {
			// For non associative arrays we need to combine the values into one.
			if ( count( $value ) === count( array_filter( array_keys( $value ), 'is_int' ) ) ) {
				$flattened[ "{$prefix}{$key}" ] = implode( ';', $value );
			} else {
				$flattened = array_merge( $flattened, flatten_array( $value, "{$prefix}{$key}" ) );
			}
		} else {
			$flattened[ "{$prefix}{$key}" ] = $value;
		}
	}

	return $flattened;
}

/**
 * Parse an Accept header.
 *
 * @param string $value Raw header value from the user.
 * @return array Parsed Accept header to pass to find_best_match()
 */
function parse_accept_header( string $value ) : array {
	$types = array_map( 'trim', explode( ',', $value ) );
	$prioritized = [];
	foreach ( $types as $type ) {
		$params = [
			'q' => 1,
		];
		if ( strpos( $type, ';' ) !== false ) {
			list( $type, $param_str ) = explode( ';', $type, 2 );
			$param_parts = array_map( 'trim', explode( ';', $param_str ) );
			foreach ( $param_parts as $part ) {
				if ( strpos( $part, '=' ) !== false ) {
					list( $key, $value ) = explode( '=', $part, 2 );
				} else {
					$key = $part;
					$value = true;
				}
				$params[ $key ] = $value;
			}
		}

		list( $type, $subtype ) = explode( '/', $type, 2 );

		// Build a regex matcher.
		$regex = ( $type === '*' ) ? '([^/]+)' : preg_quote( $type, '#' );
		$regex .= '/';
		$regex .= ( $subtype === '*' ) ? '([^/]+)' : preg_quote( $subtype, '#' );
		$regex = '#^' . $regex . '$#i';
		$prioritized[] = compact( 'type', 'subtype', 'regex', 'params' );
	}

	usort( $prioritized, function ( $a, $b ) {
		return $b['params']['q'] <=> $a['params']['q'];
	} );

	return $prioritized;
}

/**
 * Find the best matching type from available types.
 *
 * @param array $parsed Parsed Accept header from parse_accept_header()
 * @param string[] $available Available MIME types that could be served.
 * @return string|null Best matching MIME type if available, or null if none match.
 */
function find_best_accept_header_match( array $parsed, array $available ) : ?string {
	$scores = [];
	foreach ( $available as $type ) {
		// Loop through $parsed and find the first match.
		// Note: presorted by q, so first match is highest score.
		foreach ( $parsed as $acceptable ) {
			if ( preg_match( $acceptable['regex'], $type ) ) {
				$scores[ $type ] = $acceptable['params']['q'];
				break;
			}
		}
	}
	if ( empty( $scores ) ) {
		return null;
	}

	// Sort to highest score.
	arsort( $scores );

	// Return highest score.
	return array_keys( $scores )[0];
}

/**
 * Sort data by conversion rate.
 *
 * @param array $list The array of analytics data by block id.
 * @param string $orderby The parameter to sort by.
 * @param string $order The order to sort by. Accepted values are 'asc' or 'desc'.
 *
 * @return array The sorted array.
 */
function sort_by( array $list, string $orderby, string $order = 'desc' ) : array {
	$order = strtolower( $order );

	// If an invalid value was passed to $order, default to 'desc'.
	if ( ! in_array( $order, [ 'asc', 'desc' ], true ) ) {
		$order = 'desc';
	}

	$sort_order = ( $order === 'desc' ) ? SORT_DESC : SORT_ASC;
	$orderby = array_column( $list, $orderby );

	array_multisort( $orderby, $sort_order, $list );

	return $list;
}

/**
 * Return a list of country names indexed by their respective code, according to ISO 3166.
 *
 * @return array Array of country names indexed by their respective code.
 */
function get_countries() : array {
	return [
		// 'A1' => 'Anonymous Proxy',
		// 'A2' => 'Satellite Provider',
		// 'O1' => 'Other Country',
		'AF' => 'Afghanistan',
		'AX' => 'Aland Islands',
		'AL' => 'Albania',
		'DZ' => 'Algeria',
		'AS' => 'American Samoa',
		'AD' => 'Andorra',
		'AO' => 'Angola',
		'AI' => 'Anguilla',
		'AQ' => 'Antarctica',
		'AG' => 'Antigua and Barbuda',
		'AR' => 'Argentina',
		'AM' => 'Armenia',
		'AW' => 'Aruba',
		'AP' => 'Asia/Pacific Region',
		'AU' => 'Australia',
		'AT' => 'Austria',
		'AZ' => 'Azerbaijan',
		'BS' => 'Bahamas',
		'BH' => 'Bahrain',
		'BD' => 'Bangladesh',
		'BB' => 'Barbados',
		'BY' => 'Belarus',
		'BE' => 'Belgium',
		'BZ' => 'Belize',
		'BJ' => 'Benin',
		'BM' => 'Bermuda',
		'BT' => 'Bhutan',
		'BO' => 'Bolivia',
		'BQ' => 'Bonaire, Saint Eustatius and Saba',
		'BA' => 'Bosnia and Herzegovina',
		'BW' => 'Botswana',
		'BV' => 'Bouvet Island',
		'BR' => 'Brazil',
		'IO' => 'British Indian Ocean Territory',
		'BN' => 'Brunei Darussalam',
		'BG' => 'Bulgaria',
		'BF' => 'Burkina Faso',
		'BI' => 'Burundi',
		'KH' => 'Cambodia',
		'CM' => 'Cameroon',
		'CA' => 'Canada',
		'CV' => 'Cape Verde',
		'KY' => 'Cayman Islands',
		'CF' => 'Central African Republic',
		'TD' => 'Chad',
		'CL' => 'Chile',
		'CN' => 'China',
		'CX' => 'Christmas Island',
		'CC' => 'Cocos (Keeling) Islands',
		'CO' => 'Colombia',
		'KM' => 'Comoros',
		'CD' => 'Congo, The Democratic Republic of the',
		'CG' => 'Congo',
		'CK' => 'Cook Islands',
		'CR' => 'Costa Rica',
		'CI' => 'Cote d\'Ivoire',
		'HR' => 'Croatia',
		'CU' => 'Cuba',
		'CW' => 'Curacao',
		'CY' => 'Cyprus',
		'CZ' => 'Czech Republic',
		'DK' => 'Denmark',
		'DJ' => 'Djibouti',
		'DM' => 'Dominica',
		'DO' => 'Dominican Republic',
		'EC' => 'Ecuador',
		'EG' => 'Egypt',
		'SV' => 'El Salvador',
		'GQ' => 'Equatorial Guinea',
		'ER' => 'Eritrea',
		'EE' => 'Estonia',
		'ET' => 'Ethiopia',
		'EU' => 'Europe',
		'FK' => 'Falkland Islands (Malvinas)',
		'FO' => 'Faroe Islands',
		'FJ' => 'Fiji',
		'FI' => 'Finland',
		'FR' => 'France',
		'GF' => 'French Guiana',
		'PF' => 'French Polynesia',
		'TF' => 'French Southern Territories',
		'GA' => 'Gabon',
		'GM' => 'Gambia',
		'GE' => 'Georgia',
		'DE' => 'Germany',
		'GH' => 'Ghana',
		'GI' => 'Gibraltar',
		'GR' => 'Greece',
		'GL' => 'Greenland',
		'GD' => 'Grenada',
		'GP' => 'Guadeloupe',
		'GU' => 'Guam',
		'GT' => 'Guatemala',
		'GG' => 'Guernsey',
		'GW' => 'Guinea-Bissau',
		'GN' => 'Guinea',
		'GY' => 'Guyana',
		'HT' => 'Haiti',
		'HM' => 'Heard Island and McDonald Islands',
		'VA' => 'Holy See (Vatican City State)',
		'HN' => 'Honduras',
		'HK' => 'Hong Kong',
		'HU' => 'Hungary',
		'IS' => 'Iceland',
		'IN' => 'India',
		'ID' => 'Indonesia',
		'IR' => 'Iran, Islamic Republic of',
		'IQ' => 'Iraq',
		'IE' => 'Ireland',
		'IM' => 'Isle of Man',
		'IL' => 'Israel',
		'IT' => 'Italy',
		'JM' => 'Jamaica',
		'JP' => 'Japan',
		'JE' => 'Jersey',
		'JO' => 'Jordan',
		'KZ' => 'Kazakhstan',
		'KE' => 'Kenya',
		'KI' => 'Kiribati',
		'KP' => 'Korea, Democratic People\'s Republic of',
		'KR' => 'Korea, Republic of',
		'KW' => 'Kuwait',
		'KG' => 'Kyrgyzstan',
		'LA' => 'Lao People\'s Democratic Republic',
		'LV' => 'Latvia',
		'LB' => 'Lebanon',
		'LS' => 'Lesotho',
		'LR' => 'Liberia',
		'LY' => 'Libyan Arab Jamahiriya',
		'LI' => 'Liechtenstein',
		'LT' => 'Lithuania',
		'LU' => 'Luxembourg',
		'MO' => 'Macao',
		'MK' => 'Macedonia',
		'MG' => 'Madagascar',
		'MW' => 'Malawi',
		'MY' => 'Malaysia',
		'MV' => 'Maldives',
		'ML' => 'Mali',
		'MT' => 'Malta',
		'MH' => 'Marshall Islands',
		'MQ' => 'Martinique',
		'MR' => 'Mauritania',
		'MU' => 'Mauritius',
		'YT' => 'Mayotte',
		'MX' => 'Mexico',
		'FM' => 'Micronesia, Federated States of',
		'MD' => 'Moldova, Republic of',
		'MC' => 'Monaco',
		'MN' => 'Mongolia',
		'ME' => 'Montenegro',
		'MS' => 'Montserrat',
		'MA' => 'Morocco',
		'MZ' => 'Mozambique',
		'MM' => 'Myanmar',
		'NA' => 'Namibia',
		'NR' => 'Nauru',
		'NP' => 'Nepal',
		'NL' => 'Netherlands',
		'NC' => 'New Caledonia',
		'NZ' => 'New Zealand',
		'NI' => 'Nicaragua',
		'NE' => 'Niger',
		'NG' => 'Nigeria',
		'NU' => 'Niue',
		'NF' => 'Norfolk Island',
		'MP' => 'Northern Mariana Islands',
		'NO' => 'Norway',
		'OM' => 'Oman',
		'PK' => 'Pakistan',
		'PW' => 'Palau',
		'PS' => 'Palestinian Territory',
		'PA' => 'Panama',
		'PG' => 'Papua New Guinea',
		'PY' => 'Paraguay',
		'PE' => 'Peru',
		'PH' => 'Philippines',
		'PN' => 'Pitcairn',
		'PL' => 'Poland',
		'PT' => 'Portugal',
		'PR' => 'Puerto Rico',
		'QA' => 'Qatar',
		'RE' => 'Reunion',
		'RO' => 'Romania',
		'RU' => 'Russian Federation',
		'RW' => 'Rwanda',
		'BL' => 'Saint Barthelemy',
		'SH' => 'Saint Helena',
		'KN' => 'Saint Kitts and Nevis',
		'LC' => 'Saint Lucia',
		'MF' => 'Saint Martin',
		'PM' => 'Saint Pierre and Miquelon',
		'VC' => 'Saint Vincent and the Grenadines',
		'WS' => 'Samoa',
		'SM' => 'San Marino',
		'ST' => 'Sao Tome and Principe',
		'SA' => 'Saudi Arabia',
		'SN' => 'Senegal',
		'RS' => 'Serbia',
		'SC' => 'Seychelles',
		'SL' => 'Sierra Leone',
		'SG' => 'Singapore',
		'SX' => 'Sint Maarten',
		'SK' => 'Slovakia',
		'SI' => 'Slovenia',
		'SB' => 'Solomon Islands',
		'SO' => 'Somalia',
		'ZA' => 'South Africa',
		'GS' => 'South Georgia and the South Sandwich Islands',
		'SS' => 'South Sudan',
		'ES' => 'Spain',
		'LK' => 'Sri Lanka',
		'SD' => 'Sudan',
		'SR' => 'Suriname',
		'SJ' => 'Svalbard and Jan Mayen',
		'SZ' => 'Swaziland',
		'SE' => 'Sweden',
		'CH' => 'Switzerland',
		'SY' => 'Syrian Arab Republic',
		'TW' => 'Taiwan',
		'TJ' => 'Tajikistan',
		'TZ' => 'Tanzania, United Republic of',
		'TH' => 'Thailand',
		'TL' => 'Timor-Leste',
		'TG' => 'Togo',
		'TK' => 'Tokelau',
		'TO' => 'Tonga',
		'TT' => 'Trinidad and Tobago',
		'TN' => 'Tunisia',
		'TR' => 'Turkey',
		'TM' => 'Turkmenistan',
		'TC' => 'Turks and Caicos Islands',
		'TV' => 'Tuvalu',
		'UG' => 'Uganda',
		'UA' => 'Ukraine',
		'AE' => 'United Arab Emirates',
		'GB' => 'United Kingdom',
		'UM' => 'United States Minor Outlying Islands',
		'US' => 'United States',
		'UY' => 'Uruguay',
		'UZ' => 'Uzbekistan',
		'VU' => 'Vanuatu',
		'VE' => 'Venezuela',
		'VN' => 'Vietnam',
		'VG' => 'Virgin Islands, British',
		'VI' => 'Virgin Islands, U.S.',
		'WF' => 'Wallis and Futuna',
		'EH' => 'Western Sahara',
		'YE' => 'Yemen',
		'ZM' => 'Zambia',
		'ZW' => 'Zimbabwe',
	];
}
