const { useSelect } = wp.data;
const { __ } = wp.i18n;

/**
 * Component for fetching and displaying the variant title string.
 *
 * @param {React.ComponentProps} props The component props.
 * @param {object} props.variant The variant block object.
 * @param {string} props.placeholder Optional placeholder text for the variant title.
 * @returns {React.ReactNode} The title to show for the variant.
 */
const VariantTitle = ( { variant, placeholder = null } ) => {
	let hasVariant = true;
	if ( ! variant || typeof variant !== 'object' ) {
		variant = { attributes: {} };
		hasVariant = false;
	}

	const audience = useSelect( select => {
		return select( 'audience' ).getPost( variant.attributes.audience );
	}, [ variant.attributes.audience ] );

	const isLoading = useSelect( select => select( 'audience' ).getIsLoading(), [] );

	if ( ! hasVariant ) {
		return '';
	}

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
