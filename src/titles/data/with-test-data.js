import deepmerge from 'deepmerge';
import { DEFAULT_TEST } from './shapes';

const { apiFetch } = wp;
const { withSelect, withDispatch } = wp.data;
const { compose, withState } = wp.compose;
const { __ } = wp.i18n;

const overwriteMerge = ( dest, source ) => source;

const dispatchHandler = ( dispatch, props ) => {
	const {
		ab_tests,
		post,
		postType,
		setState,
	} = props;

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
	withDispatch( dispatchHandler ),
);

export default withTestData;
