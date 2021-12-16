import deepmerge from 'deepmerge';

import { getTestsRegistry } from './registry';
import { DEFAULT_TEST } from './shapes';

const { apiFetch } = wp;
const { withSelect, withDispatch } = wp.data;
const { compose, withState } = wp.compose;
const { __ } = wp.i18n;

/**
 * Function for handling array merge behaviour. Replaces old array with new.
 *
 * @param {Array} dest Original array.
 * @param {Array} source New array.
 * @returns {Array} The new array.
 */
const overwriteMerge = ( dest, source ) => source;

/**
 * A/B test form handler.
 *
 * @param {Function} dispatch Redux store dispatcher.
 * @param {React.ComponentProps} props The enhanced component's props.
 * @returns {React.ComponentProps} Additional component props.
 */
const dispatchHandler = ( dispatch, props ) => {
	const {
		ab_tests,
		post,
		postType,
		setState,
		testId,
	} = props;

	const abTest = getTestsRegistry().get( testId );

	/**
	 * @param {object} data Test data to save.
	 */
	const saveTest = async data => {
		setState( { isSaving: true } );

		try {
			await apiFetch( {
				path: `/wp/v2/${ postType.rest_base }/${ post.id }` +
					`?context=edit&_timestamp=${ Date.now() }`,
				method: 'PATCH',
				body: JSON.stringify( data ),
			} );
		} catch ( error ) {
			setState( { error: error } );
		}

		setState( { isSaving: false } );
	};

	/**
	 * @param {object} test Test data to update.
	 * @param {Array|boolean} values Array of values or false if none set yet.
	 * @param {boolean} save If true save updates to the database, if false just update redux store.
	 */
	const updateTest = async ( test = {}, values = false, save = false ) => {
		const data = {
			ab_tests: deepmerge( ab_tests, {
				[ abTest.id ]: test,
			}, {
				arrayMerge: overwriteMerge,
			} ),
		};

		if ( values !== false ) {
			data[ `ab_test_${ abTest.id }` ] = values;
		}

		// Send the data to the API if we want to save it.
		if ( save ) {
			await saveTest( data );
		}

		dispatch( 'core/editor' ).editPost( data );
	};

	/**
	 * @param {Array} values List of values to update.
	 * @param {boolean} save If true save updates to database, if false only update redux store.
	 */
	const updateValues = async ( values, save = false ) => {
		const data = {
			[ `ab_test_${ abTest.id }` ]: values,
		};

		// Send the data to the API if we want to save it.
		if ( save ) {
			await saveTest( data );
		}

		dispatch( 'core/editor' ).editPost( data );
	};

	/**
	 * @param {string} message Confirmation message to show when resetting test data.
	 */
	const resetTest = message => {
		const confirmation = message || __( 'Are you sure you want to reset the test?', 'altis-analytics' );

		if ( ! window.confirm( confirmation ) ) {
			return;
		}

		updateTest( DEFAULT_TEST, [], true );
	};

	/**
	 * @param {*} value Value to reset to.
	 */
	const revertValue = value => {
		// Default no-op.
	};

	return {
		updateTest,
		updateValues,
		resetTest,
		saveTest,
		revertValue,
		...abTest.dispatcher( dispatch ) || {},
	};
};

const withTestData = compose(
	withState( {
		isSaving: false,
		prevValues: [],
		error: false,
	} ),
	withSelect( ( select, props ) => {
		const { testId } = props;
		const abTest = getTestsRegistry().get( testId );

		return {
			ab_tests: select( 'core/editor' ).getEditedPostAttribute( 'ab_tests' ),
			post: select( 'core/editor' ).getCurrentPost(),
			postType: select( 'core' ).getPostType( select( 'core/editor' ).getCurrentPostType() ),
			test: select( 'core/editor' ).getEditedPostAttribute( 'ab_tests' )[ abTest.id ] || DEFAULT_TEST,
			originalValues: select( 'core/editor' ).getCurrentPostAttribute( `ab_test_${ abTest.id }` ) || [],
			values: select( 'core/editor' ).getEditedPostAttribute( `ab_test_${ abTest.id }` ) || [],
			defaultValue: '',
			...abTest.selector( select ) || {},
		};
	} ),
	withDispatch( dispatchHandler )
);

export default withTestData;
