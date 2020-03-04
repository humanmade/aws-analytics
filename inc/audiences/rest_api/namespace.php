<?php
/**
 * Audience REST API.
 *
 * @package altis-analytics
 */

namespace Altis\Analytics\Audiences\REST_API;

function setup() {
	add_action( 'rest_api_init', __NAMESPACE__ . '\\init' );
}

function init() {

	register_rest_route( 'analytics/v1', 'audiences/test', [] );

}
