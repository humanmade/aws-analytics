const { useSelect } = wp.data;
const { __ } = wp.i18n;

// Component for fetching and displaying the variant title string.
const VariantTitle = ( { variant, placeholder = null } ) => {
	if ( ! variant || typeof variant !== 'object' ) {
		return '';
	}

	const audience = useSelect( select => {
		return select( 'audience' ).getPost( variant.attributes.audience );
	}, [ variant.attributes.audience ] );

	const isLoading = useSelect( select => select( 'audience' ).getIsLoading(), [] );

	if ( variant.attributes.fallback ) {
		return __( 'Fallback', 'altis-experiments' );
	}

	if ( ! variant.attributes.audience ) {
		if ( placeholder ) {
			return placeholder;
		}
		return __( 'Select audience', 'altis-experiments' );
	}

	const status = ( audience && audience.status ) || 'draft';
	const title = audience && audience.title && audience.title.rendered;

	// Audience is valid and has a title.
	if ( status !== 'trash' && title ) {
		return audience.title.rendered;
	}

	// Audience has been deleted.
	if ( status === 'trash' ) {
		return __( '(deleted)', 'altis-experiments' );
	}

	// Check if audience reponse is a REST API error.
	if ( audience && audience.error && audience.error.message ) {
		return audience.error.message;
	}

	if ( isLoading ) {
		return __( 'Loading...', 'altis-experiments' );
	}

	return '';
};

export default VariantTitle;
