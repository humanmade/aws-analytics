// Ensure Experiments global object is set.
window.Altis.Analytics.Experiments = window.Altis.Analytics.Experiments || {};

/**
 * Test element base class.
 */
class Test extends HTMLElement {

	storageKey = '_altis_tests';

	get testId() {
		return this.getAttribute( 'test-id' );
	}

	get postId() {
		return this.getAttribute( 'post-id' );
	}

	get testIdWithPost() {
		return `${ this.testId }_${ this.postId }`;
	}

	get trafficPercentage() {
		return this.getAttribute( 'traffic-percentage' );
	}

	get variants() {
		return JSON.parse( this.getAttribute( 'variants' ) ) || [];
	}

	get fallback() {
		return this.getAttribute( 'fallback' );
	}

	get goal() {
		return this.getAttribute( 'goal' );
	}

	get selector() {
		return this.getAttribute( 'selector' );
	}

	get closest() {
		return this.getAttribute( 'closest' );
	}

	connectedCallback() {
		// Extract test set by URL parameters.
		const regex = new RegExp( `(utm_campaign|set_test)=test_${ this.testIdWithPost }:(\\d+)`, 'i' );
		const url_test = unescape( window.location.search ).match( regex );
		if ( url_test ) {
			this.addTestForUser( { [ this.testIdWithPost ]: parseInt( url_test[ 2 ], 10 ) } );
		}

		// Initialise component.
		this.init();
	}

	init() {
		window.console && window.console.error( 'Children of Class Test must implement an init() method.' );
	}

	getTestsForUser() {
		return JSON.parse( window.localStorage.getItem( this.storageKey ) ) || {};
	}

	addTestForUser( test ) {
		window.localStorage.setItem( this.storageKey, JSON.stringify( {
			...this.getTestsForUser(),
			...test,
		} ) );
	}

}

/**
 * Custom AB Test element.
 */
class ABTest extends Test {

	storageKey = '_altis_ab_tests';

	init() {
		// Assign variant ID.
		const variantId = this.getVariantId();

		// Don't process if not part of the test.
		if ( variantId === false ) {
			this.outerHTML = this.fallback;
			return;
		}

		// Get data for event listener.
		const testId = this.testId;
		const postId = this.postId;
		const parent = this.parentNode;
		const goal = this.goal.split( ':' );
		const closest = this.closest;
		const [ eventType, selector = this.selector ] = goal;

		// Get the variant content.
		const variant = this.variants[ variantId || 0 ];

		// Replace the contents of our <ab-test> element.
		this.outerHTML = variant;

		// Call goal handler on parent.
		const goalHandler = getGoalHandler( eventType, {
			selector,
			closest,
		} );
		if ( ! eventType || ! goalHandler ) {
			return;
		}

		// Apply goal callback.
		goalHandler( parent, ( attributes = {}, metrics = {} ) => {
			window.Altis.Analytics.record( eventType, {
				attributes: {
					...attributes,
					eventTestId: testId,
					eventPostId: postId,
					eventVariantId: variantId,
				},
				metrics: {
					...metrics,
				},
			} );
		} );
	}

	getVariantId() {
		const testId = this.testIdWithPost;
		const trafficPercentage = this.trafficPercentage;

		// Check if this user already have a variant for this test.
		const currentTests = this.getTestsForUser();
		let variantId = false;
		// Test variant can be 0 so check for not undefined and not strictly false and
		// that it's a valid index.
		if (
			typeof currentTests[ testId ] !== 'undefined' &&
			currentTests[ testId ] !== false &&
			currentTests[ testId ] < this.variants.length
		) {
			variantId = currentTests[ testId ];
		} else if ( currentTests[ testId ] === false ) {
			return variantId;
		} else {
			// Otherwise lets check the probability we should experiment on this individual.
			// That sounded weird.
			if ( Math.random() * 100 > trafficPercentage ) {
				// Exclude from this test.
				this.addTestForUser( {
					[ testId ]: false,
				} );
				return variantId;
			}
			// Add one of the variants to the cookie.
			variantId = Math.floor( Math.random() * this.variants.length );
			this.addTestForUser( {
				[ testId ]: variantId,
			} );
		}

		// Log active test variant for all events.
		if ( window.Altis && window.Altis.Analytics ) {
			window.Altis.Analytics.registerAttribute( `test_${ testId }`, variantId );
		}

		return variantId;
	}

}

/**
 * Static list of goal handlers.
 */
const goalHandlers = {};

/**
 * Add an event handler for recording an analytics event.
 * The event is then used to determine the goal success.
 *
 * Callback receives the target node and a function to record
 * to record the event.
 *
 * @param {string} name of the goal.
 * @param {Function} callback to bind an event listener.
 * @param {string[]} closest Array of allowed node types to bind listener to.
 */
const registerGoalHandler = ( name, callback, closest = [] ) => {
	goalHandlers[ name ] = {
		callback,
		closest: Array.isArray( closest ) ? closest : [ closest ],
	};
};

/**
 * Attaches an event listener to a node and passes event data to a callback when fired.
 *
 * @param {HTMLElement} node The target node to attach the event listener to.
 * @param {Function} record The function called by the event listener to record an event.
 * @param {string} on The JS dvent name to listen on.
 * @returns {?EventListener} The event listener handle if successful or undefined.
 */
const bindListener = ( node, record, on ) => node && node.addEventListener( on, event => {
	if ( typeof record !== 'function' ) {
		console.error( 'Altis Analytics goal handler is not a function', node, event );
		return;
	}
	record( event );
} );

/**
 * Get a goal handling function.
 *
 * @param {string} name The name of a registered goal, goal handler or a valid JS event.
 * @param {object} options Optional overrides for the registered goal properties.
 * @returns {Function} Callback for recording the goal.
 */
const getGoalHandler = ( name, options = {} ) => {
	// Compile the goal configuration.
	const goal = {
		name,
		event: name,
		callback: bindListener,
		...( window.Altis.Analytics.Experiments.Goals[ name ] || {} ),
		...( goalHandlers[ name ] || {} ),
		...options,
	};

	// Return a callback that handles the goal configuration and binds event listeners.
	return ( node, record ) => {
		if ( goal.closest ) {
			node = node.closest( goal.closest );
		}

		if ( goal.selector ) {
			node.querySelectorAll( goal.selector ).forEach( child => goal.callback( child, record, goal.event ) );
			return;
		}

		goal.callback( node, record, goal.event );
	};
};

// Register built in click goal handler.
registerGoalHandler( 'click', ( element, record ) => {
	if ( ! element ) {
		return;
	}

	// Collect attributes.
	const attributes = {
		elementNode: element.nodeName || '',
		elementText: element.innerText || '',
		elementClassName: element.className || '',
		elementId: element.id || '',
		elementHref: element.href || '',
	};

	// Bind handler.
	element.addEventListener( 'click', event => {
		record( Object.assign( {}, attributes, {
			targetNode: event.target.nodeName || '',
			targetText: event.target.innerText || '',
			targetClassName: event.target.className || '',
			targetId: event.target.id || '',
			targetSrc: event.target.nodeName === 'IMG' ? event.target.src : '',
		} ) );
	} );
}, [ 'a' ] );

/**
 * Personalized content block element.
 */
class PersonalizationBlock extends HTMLElement {

	get clientId() {
		return this.getAttribute( 'client-id' );
	}

	connectedCallback() {
		// Track load status.
		this.audience = false;

		// Set default styles.
		this.attachShadow( { mode: 'open' } );
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: block;
				}
			</style>
			<slot></slot>
		`;

		// Update the component content.
		this.setContent();

		// Attach a listener to update the content when audiences are changed.
		window.Altis.Analytics.on( 'updateAudiences', this.setContent );
	}

	/**
	 * Updates the block content if needed and performs analytics tracking actions.
	 */
	setContent = () => {
		const audiences = window.Altis.Analytics.getAudiences() || [];

		// Track the audience for recording an event later.
		let audience = 0;

		// Get conversion goal from template if found.
		let goal = false;

		// Track the template we want.
		let template;

		// Find a matching template.
		for ( let index = 0; index < audiences.length; index++ ) {
			// Find the first matching audience template.
			template = document.querySelector( `template[data-audience="${ audiences[ index ] }"][data-parent-id="${ this.clientId }"]` );
			if ( ! template ) {
				continue;
			}

			// We have a matching template, update audience and fallback value.
			audience = audiences[ index ];

			// Set goal.
			goal = template.dataset.goal;
			break;
		}

		// Set fallback content if needed.
		if ( ! audience ) {
			template = document.querySelector( `template[data-fallback][data-parent-id="${ this.clientId }"]` );
			if ( ! template ) {
				return;
			}

			// Set goal.
			goal = template.dataset.goal;
		}

		// Avoid resetting content if it hasn't changed.
		if ( this.audience === audience ) {
			return;
		}

		// Track the set audience to avoid unnecessary updates.
		this.audience = audience;

		// Populate experience block content.
		const experience = template.content.cloneNode( true );
		this.innerHTML = '';
		this.appendChild( experience );

		// Record a load event for conversion tracking.
		window.Altis.Analytics.record( 'experienceLoad', {
			attributes: {
				audience,
				clientId: this.clientId,
				type: 'personalization',
			},
		} );

		// Log an event for tracking views and audience when scrolled into view.
		let tracked = false;
		let observer = new IntersectionObserver( ( entries, observer ) => {
			entries.forEach( entry => {
				if ( entry.target !== this || ! entry.isIntersecting ) {
					return;
				}

				if ( tracked ) {
					return;
				}

				// Prevent spamming events.
				tracked = true;
				observer.disconnect();

				window.Altis.Analytics.record( 'experienceView', {
					attributes: {
						audience,
						clientId: this.clientId,
						type: 'personalization',
					},
				}, false );
			} );
		}, {
			threshold: 0.75,
		} );

		// Trigger scroll handler.
		observer.observe( this );

		// Get goal handler from registered goals.
		const goalHandler = getGoalHandler( goal );
		if ( ! goalHandler ) {
			return;
		}

		// Bind goal event handler to this component.
		let goalTracked = false;
		goalHandler( this, event => {
			if ( goalTracked ) {
				return;
			}

			// Only track once.
			goalTracked = true;

			window.Altis.Analytics.record( 'conversion', {
				attributes: {
					audience,
					clientId: this.clientId,
					goal,
					type: event.type,
				},
			} );
		} );

		// Dispatch the altisBlockContentChanged event.
		window.dispatchEvent( new Event( 'altisBlockContentChanged' ) );
	}

}

// Expose experiments API functions.
window.Altis.Analytics.Experiments.registerGoal = registerGoalHandler; // Back compat.
window.Altis.Analytics.Experiments.registerGoalHandler = registerGoalHandler;

// Define custom elements when analytics has loaded.
window.Altis.Analytics.onReady( () => {
	window.customElements.define( 'ab-test', ABTest );
	window.customElements.define( 'personalization-block', PersonalizationBlock );
} );

// Fire a ready event once userland API has been exported.
const readyEvent = new CustomEvent( 'altis.experiments.ready' );
window.dispatchEvent( readyEvent );
