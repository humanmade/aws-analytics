import TextInput from '../components/field-text-input';
import ImageInput from '../components/field-image-input';

const { doAction } = wp.hooks;

/**
 * Tests registry class.
 */
export default class TestsRegistry {
	tests = {};

	/**
	 * Initiatlize the class, transforming passed options to usable test objects.
	 *
	 * @param {object} tests Initial tests object to see the registry.
	 */
	constructor( tests ) {
		for ( let id in tests ) {
			const _test = tests[ id ];

			/* eslint-disable jsdoc/require-jsdoc */
			this.tests[ id ] = {
				id,
				title: _test.label,
				singleTitle: _test.singular_label,
				component: this.resolveComponent( _test.input_type ),
				displayValue: value => value,
				dispatcher: () => ( {} ),
				selector: () => ( {} ),
			};
			/* eslint-enable */
		}
	}

	/**
	 * Returns a registered test options object.
	 *
	 * @param {string} id Test ID.
	 * @returns {object} Test options object.
	 */
	get( id ) {
		const test = this.tests[ id ];

		if ( ! test ) {
			throw new Error( `Test ${ id } was not found, tests needs to be registered in PHP using Altis\\Analytics\\Experiments\\register_post_ab_test().` );
		}

		return test;
	}

	/**
	 * Update a registered test options object.
	 *
	 * @param {string} id Test ID.
	 * @param {object} options Updated test options object.
	 */
	update( id, options ) {
		const test = this.get( id );

		this.validate( options );

		this.tests = {
			...this.tests,
			[ id ]: {
				...test,
				...options,
			},
		};
	}

	/**
	 * Validate the test options object.
	 *
	 * @param {object} options test options object.
	 */
	validate( options ) {
		const validOptionKeys = [
			'title',
			'singleTitle',
			'component',
			'displayValue',
			'dispatcher',
			'selector',
		];

		for ( let key in options ) {
			if ( validOptionKeys.indexOf( key ) < 0 ) {
				throw new Error( `Invalid options passed to ABTests.update(), ${ key } is not an accepted option key.` );
			}
		}
	}

	/**
	 * Resolve test input component via `input_type` property of the registered test.
	 *
	 * @param {string} name Input type of the test as defined in PHP.
	 * @returns {React.ReactNode} Returns a React component class.
	 */
	resolveComponent( name ) {
		if ( name === 'text' ) {
			return TextInput;
		} else if ( name === 'image' ) {
			return ImageInput;
		} else if ( name in window ) {
			// Allow arbitrary classes to be passed from PHP, provided it's defined in JS beforehand.
			return window[name];
		} else {
			return TextInput;
		}
	}
}

/**
 * Return a global instance of the TestsRegistry class.
 *
 * @returns {TestsRegistry}
 */
export const getTestsRegistry = () => {
	// Initialise the tests registry, it haven't already.
	if ( ! window.Altis.Analytics.Experiments.TestsRegistry ) {
		window.Altis.Analytics.Experiments.TestsRegistry = new TestsRegistry( window.Altis.Analytics.Experiments.PostABTests || {} );
		doAction( 'altis.experiments.registry.loaded', window.Altis.Analytics.Experiments.TestsRegistry );
	}

	return window.Altis.Analytics.Experiments.TestsRegistry;
};
