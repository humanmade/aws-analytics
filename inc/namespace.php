<?php
/**
 * Analytics helpers.
 *
 * @package hm-analytics
 *
 *
 * @TODO:
 * - Analytics ES service client getter
 * -
 */

namespace HM\Analytics;

require_once ROOT_DIR . '/inc/helpers.php';
require_once ROOT_DIR . '/inc/class-ab-test.php';
require_once ROOT_DIR . '/inc/class-post-ab-test.php';

// Include features.
require_once ROOT_DIR . '/inc/features/title_ab_test.php';

function setup() {
	// Load analytics scripts early.
	add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\enqueue_scripts', 1 );

	/**
	 * Enable Title AB Tests.
	 *
	 * @param bool $enabled Whether to enable this feature or not.
	 */
	$title_ab_testing = apply_filters( 'hm.analytics.title_ab_test.enabled', true );
	if ( $title_ab_testing ) {
		Features\Title_AB_Test\setup();
	}
}

function get_data_layer() : array {

	// Initialise data array.
	$data = [
		'Endpoint' => [],
		'AppPackageName' => sanitize_key( get_bloginfo('name') ),
		'AppVersion' => '',
		'SiteName' => get_bloginfo('name'),
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
	}

	/**
	 * Filter the custom analytics endpoint/user data.
	 *
	 * @param array $data
	 */
	$data['Endpoint'] = (object) apply_filters( 'hm.analytics.data.endpoint', $data['Endpoint'] );

	/**
	 * Filter the custom analytics attributes to record with all events.
	 *
	 * @param array $data
	 */
	$data['Attributes'] = (object) apply_filters( 'hm.analytics.data.attributes', $data['Attributes'] );

	/**
	 * Filter the custom analytics variable data.
	 *
	 * @param array $data
	 */
	$data = apply_filters( 'hm.analytics.data', $data );

	return $data;
}

/**
 * Get the client side tests config.
 *
 * @return void
 */
function get_tests() {
	/**
	 * Tests add to this filter when created.
	 *
	 * @param array $tests An array of test config objects.
	 */
	$tests = apply_filters( 'hm.analytics.tests', [] );

	return $tests;
}

/**
 * Queue up the tracker script and required configuration.
 */
function enqueue_scripts() {
	wp_enqueue_script( 'hm-analytics', plugins_url( 'build/tracker.js', __DIR__ ), [], null, false );
	wp_add_inline_script(
		'hm-analytics',
		sprintf(
			'var HM = HM || {}; HM.Analytics = %s;', wp_json_encode(
				[
					'Config' => [
						'PinpointId' => defined( 'HM_ANALYTICS_PINPOINT_ID' ) ? HM_ANALYTICS_PINPOINT_ID : null,
						'PinpointRegion' => defined( 'HM_ANALYTICS_PINPOINT_REGION' ) ? HM_ANALYTICS_PINPOINT_REGION : null,
						'PinpointEndpoint' => defined( 'HM_ANALYTICS_PINPOINT_ENDPOINT' ) ? HM_ANALYTICS_PINPOINT_ENDPOINT : null,
						'CognitoId' => defined( 'HM_ANALYTICS_COGNITO_ID' ) ? HM_ANALYTICS_COGNITO_ID : null,
						'CognitoRegion' => defined( 'HM_ANALYTICS_COGNITO_REGION' ) ? HM_ANALYTICS_COGNITO_REGION : null,
						'CognitoEndpoint' => defined( 'HM_ANALYTICS_COGNITO_ENDPOINT' ) ? HM_ANALYTICS_COGNITO_ENDPOINT : null,
					],
					'Tests' => apply_filters( 'hm.analytics.tests', [] ),
					'Data' => get_data_layer(),
				]
			)
		),
		'before'
	);
}

/**
 * Register a new standard AB Test.
 *
 * @param string $id
 * @return AB_Test
 */
function register_ab_test( string $id ) : AB_Test {
	$test = new AB_Test( $id );
	$test->init();
	return $test;
}

/**
 * Register a new Post AB Test.
 *
 * @param string $id A unique ID for the test.
 * @param callable $init A callback in which to configure variants and goals.
 * @param array $schema An optional REST API schema for storing and retrieving your variant data.
 *                      Defaults to [ 'type' => 'string' ].
 * @return Post_AB_Test
 */
function register_post_ab_test( string $id, callable $init, ?array $schema = null ) : Post_AB_Test {
	$test = new Post_AB_Test( $id );
	if ( ! empty( $schema ) ) {
		$test->set_variant_data_schema( $schema );
	}
	$test->on_init( $init );
	return $test;
}
