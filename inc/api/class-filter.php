<?php
/**
 * Altis Accelerate analytics data filter.
 *
 * @package altis/accelerate
 */

namespace Altis\Analytics\API;

/**
 * Filter container object.
 */
class Filter {
	/**
	 * A URL path to filter on.
	 *
	 * @var string
	 */
	public $path;

	/**
	 * Search term.
	 *
	 * @var string
	 */
	public $search;

	/**
	 * Post type.
	 *
	 * @var string
	 */
	public $type;

	/**
	 * User / author ID.
	 *
	 * @var int
	 */
	public $user;

	/**
	 * Current page.
	 *
	 * @var int
	 */
	public $page = 1;

	/**
	 * Restrict to specific post IDs.
	 *
	 * @var int[]
	 */
	public $include = [];
}
