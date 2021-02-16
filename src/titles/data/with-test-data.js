import deepmerge from 'deepmerge';
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
	} = props;

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
	 * @param {Array|boolean} titles Array of titles or false if none set yet.
	 * @param {boolean} save If true save updates to the database, if false just update redux store.
	 */
	const updateTest = async ( test = {}, titles = false, save = false ) => {
		const data = {
			ab_tests: deepmerge( ab_tests, {
				titles: test,
			}, {
				arrayMerge: overwriteMerge,
			} ),
		};

		if ( titles !== false ) {
			data.ab_test_titles = titles;
		}

		// Send the data to the API if we want to save it.
		if ( save ) {
			await saveTest( data );
		}

		dispatch( 'core/editor' ).editPost( data );
	};

	/**
	 * @param {Array} titles List of titles to update.
	 * @param {boolean} save If true save updates to database, if false only update redux store.
	 */
	const updateTitles = async ( titles, save = false ) => {
		const data = {
			ab_test_titles: titles,
		};

		// Send the data to the API if we want to save it.
		if ( save ) {
			await saveTest( data );
		}

		dispatch( 'core/editor' ).editPost( data );
	};

	return {
		updateTest,
		updateTitles,
		/**
		 * @param {string} message Confirmation message to show when resetting test data.
		 */
		resetTest: message => {
			const confirmation = message || __( 'Are you sure you want to reset the test?', 'altis-experiments' );

			if ( ! window.confirm( confirmation ) ) {
				return;
			}

			updateTest( DEFAULT_TEST, [], true );
		},
		saveTest,
	};
};

const withTestData = compose(
	withState( {
		isSaving: false,
		prevTitles: [],
		error: false,
	} ),
	withSelect( select => {
		const currentPostType = select( 'core/editor' ).getCurrentPostType();

		return {
			ab_tests: select( 'core/editor' ).getEditedPostAttribute( 'ab_tests' ),
			originalTitles: select( 'core/editor' ).getCurrentPostAttribute( 'ab_test_titles' ) || [],
			post: select( 'core/editor' ).getCurrentPost(),
			postType: select( 'core' ).getPostType( currentPostType ),
			test: select( 'core/editor' ).getEditedPostAttribute( 'ab_tests' ).titles || DEFAULT_TEST,
			title: select( 'core/editor' ).getEditedPostAttribute( 'title' ) || '',
			titles: select( 'core/editor' ).getEditedPostAttribute( 'ab_test_titles' ) || [],
		};
	} ),
	withDispatch( dispatchHandler )
);

export default withTestData;
