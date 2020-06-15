<?php
/**
 * Altis Analytics.
 *
 * @package altis-analytics
 *
 */

namespace Altis\Analytics;

function setup() {
	// Handle async scripts.
	add_filter( 'script_loader_tag', __NAMESPACE__ . '\\async_scripts', 20, 2 );
	// Load analytics scripts super early.
	add_action( 'wp_head', __NAMESPACE__ . '\\enqueue_scripts', 0 );
}

/**
 * Returns contextual data to be associated with the user's endpoint
 * as well as custom attributes and metrics to record with every
 * analytics event.
 *
 * @uses apply_filters( 'hm.analytics.data.endpoint', $endpoint );
 * @uses apply_filters( 'hm.analytics.data.attributes', $attributes );
 * @uses apply_filters( 'hm.analytics.data', $data );
 *
 * @return array
 */
function get_client_side_data() : array {

	// Initialise data array.
	$data = [
		'Endpoint' => [],
		'AppPackageName' => sanitize_key( get_bloginfo( 'name' ) ),
		'AppVersion' => '',
		'SiteName' => get_bloginfo( 'name' ),
		'Attributes' => [],
		'Metrics' => [],
	];

	if ( is_user_logged_in() ) {
		$user = wp_get_current_user();
		$data['Endpoint']['User'] = [];
		$data['Endpoint']['User']['UserId'] = $user->get( 'ID' );
		$data['Endpoint']['User']['UserAttributes'] = [
			'Roles' => array_keys( $user->caps ),
		];
	}

	if ( is_front_page() ) {
		$data['Attributes']['frontPage'] = true;
	}

	if ( is_404() ) {
		$data['Attributes']['404'] = true;
	}

	if ( is_singular() ) {
		$data['Attributes']['postType'] = get_queried_object()->post_type;
		$data['Attributes']['postId'] = get_queried_object_id();

		$author = get_user_by( 'id', get_queried_object()->post_author );
		if ( $author ) {
			$data['Attributes']['author'] = $author->get( 'user_nicename' );
			$data['Attributes']['authorId'] = $author->get( 'ID' );
		}
	}

	if ( is_archive() ) {
		$data['Attributes']['archive'] = true;

		if ( is_date() ) {
			$data['Attributes']['archiveType'] = 'date';
			$data['Attributes']['date'] = get_the_date();
		}

		if ( is_search() ) {
			$data['Attributes']['archiveType'] = 'search';
			$data['Attributes']['search'] = get_search_query();
		}

		if ( is_post_type_archive() ) {
			$data['archiveType'] = get_post_type();
		}

		if ( is_tag() || is_category() || is_tax() ) {
			$data['Attributes']['archiveType'] = get_queried_object()->taxonomy;
			$data['Attributes']['term'] = get_queried_object()->slug;
		}

		if ( is_author() ) {
			$data['Attributes']['archiveType'] = 'author';
			$data['Attributes']['author'] = get_queried_object()->user_nicename;
		}
	}

	if ( is_multisite() ) {
		$data['Attributes']['blog'] = home_url();
		$data['Attributes']['network'] = network_home_url();
		$data['Attributes']['blogId'] = get_current_blog_id();
		$data['Attributes']['networkId'] = get_current_network_id();
	}

	/**
	 * Filter the custom analytics endpoint/user data.
	 *
	 * @param array $data
	 */
	$data['Endpoint'] = (object) apply_filters( 'altis.analytics.data.endpoint', $data['Endpoint'] );

	/**
	 * Filter the custom analytics attributes to record with all events.
	 *
	 * @param array $data
	 */
	$data['Attributes'] = (object) apply_filters( 'altis.analytics.data.attributes', $data['Attributes'] );

	/**
	 * Filter the custom analytics metrics to record with all events.
	 *
	 * @param array $data
	 */
	$data['Metrics'] = (object) apply_filters( 'altis.analytics.data.metrics', $data['Metrics'] );

	/**
	 * Filter the custom analytics variable data.
	 *
	 * @param array $data
	 */
	$data = apply_filters( 'altis.analytics.data', $data );

	return $data;
}

/**
 * Adds an async attribute to the script tag output.
 *
 * @param string $tag The enqueued HTML script tag.
 * @param string $handle The script handle.
 * @return string The script tag markup.
 */
function async_scripts( string $tag, string $handle ) : string {
	global $wp_scripts;

	if ( ! $wp_scripts->get_data( $handle, 'async' ) || strpos( $tag, 'async' ) !== false ) {
		return $tag;
	}

	$tag = str_replace( '></script>', ' async></script>', $tag );

	return $tag;
}

/**
 * Queue up the tracker script and required configuration.
 */
function enqueue_scripts() {
	global $wp_scripts;

	wp_enqueue_script( 'altis-analytics', plugins_url( 'build/analytics.js', __DIR__ ), [], '39b9b590cb3ec7cb1ca0f5c77ce8437a', false );
	wp_add_inline_script(
		'altis-analytics',
		sprintf(
			'var Altis = Altis || {}; Altis.Analytics = %s;' .
			'Altis.Analytics.registerAttribute = function (key, value) { Altis.Analytics._attributes[key] = value; };' .
			'Altis.Analytics.registerMetric = function (key, value) { Altis.Analytics._metrics[key] = value; };',
			wp_json_encode(
				[
					'Config' => [
						'PinpointId' => defined( 'ALTIS_ANALYTICS_PINPOINT_ID' ) ? ALTIS_ANALYTICS_PINPOINT_ID : null,
						'PinpointRegion' => defined( 'ALTIS_ANALYTICS_PINPOINT_REGION' ) ? ALTIS_ANALYTICS_PINPOINT_REGION : null,
						'PinpointEndpoint' => defined( 'ALTIS_ANALYTICS_PINPOINT_ENDPOINT' ) ? ALTIS_ANALYTICS_PINPOINT_ENDPOINT : null,
						'CognitoId' => defined( 'ALTIS_ANALYTICS_COGNITO_ID' ) ? ALTIS_ANALYTICS_COGNITO_ID : null,
						'CognitoRegion' => defined( 'ALTIS_ANALYTICS_COGNITO_REGION' ) ? ALTIS_ANALYTICS_COGNITO_REGION : null,
						'CognitoEndpoint' => defined( 'ALTIS_ANALYTICS_COGNITO_ENDPOINT' ) ? ALTIS_ANALYTICS_COGNITO_ENDPOINT : null,
					],
					'Data' => (object) get_client_side_data(),
					'_attributes' => (object) [],
					'_metrics' => (object) [],
				]
			)
		),
		'before'
	);

	// Load async for performance.
	$wp_scripts->add_data( 'altis-analytics', 'async', true );

	/**
	 * Create our own early hook for queueing
	 */
	do_action( 'altis.analytics.enqueue_scripts' );

	// Print queued scripts.
	print_head_scripts();
}
