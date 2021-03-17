<?php
/**
 * Audience REST API posts controller.
 *
 * @package altis/aws-analytics
 */

namespace Altis\Analytics\Audiences\REST_API;

use WP_Error;
use WP_REST_Posts_Controller;

/**
 * Audience Posts Controller Class.
 */
class Posts_Controller extends WP_REST_Posts_Controller {

	/**
	 * API constructor.
	 *
	 * @param string $post_type Endpoint base.
	 */
	public function __construct( $post_type ) {
		parent::__construct( $post_type );
		$this->namespace = 'analytics/v1';
	}

	/**
	 * Check whether the posts can be read or not.
	 *
	 * @param WP_Post $post The post object to check read permission for.
	 * @return bool
	 */
	public function check_read_permission( $post ) {
		if ( current_user_can( 'read_post', $post->ID ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Checks if a given request has access to read posts.
	 *
	 * @param WP_REST_Request $request Full details about the request.
	 * @return true|WP_Error True if the request has read access, WP_Error object otherwise.
	 */
	public function get_items_permissions_check( $request ) {
		$post_type = get_post_type_object( $this->post_type );

		if ( ! current_user_can( $post_type->cap->read ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'Sorry, you are not allowed to view audiences.' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}

		return true;
	}

}
