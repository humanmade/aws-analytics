<?php
/**
 * Broadcasts REST API posts controller.
 *
 * @package altis/aws-analytics
 */

namespace Altis\Analytics\Broadcast;

use WP_REST_Posts_Controller;

/**
 * Broadcast Posts Controller Class.
 */
class Posts_Controller extends WP_REST_Posts_Controller {

	/**
	 * API constructor.
	 *
	 * @param string $post_type Endpoint base.
	 */
	public function __construct( $post_type ) {
		parent::__construct( $post_type );
		$this->namespace = 'accelerate/v1';
		$this->rest_base = 'broadcast';
	}

}
