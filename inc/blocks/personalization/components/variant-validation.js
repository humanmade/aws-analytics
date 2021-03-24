import React, { useCallback, useEffect, useState } from 'react';

const { serverSideRender: ServerSideRender } = wp;
const { serialize } = wp.blocks;
const { Disabled, Spinner, withNotices } = wp.components;
const { __, sprintf } = wp.i18n;

const watcher = new MutationObserver( mutations => {
	for ( const mutation of mutations ) {
		const event = new CustomEvent( 'updated' );
		mutation.target.dispatchEvent( event );
	}
} );

const MemoisedSSR = React.memo( ( { clientId, content } ) => (
	<ServerSideRender
		attributes={ {
			clientId,
			content,
		} }
		block="altis/shim"
		httpMethod="POST"
		LoadingResponsePlaceholder={ () => (
			<div className="altis-variant-validation__loading">
				<Spinner />
				{ ' ' }
				{ __( 'Validating...', 'altis-analytics' ) }
			</div>
		) }
	/>
) );

/**
 * Validation component for variants.
 *
 * @param {object} props Component props.
 * @param {Array} props.blocks Variant inner blocks.
 * @param {string} props.clientId The variant block client ID.
 * @param {string} props.goal The variation goal name.
 * @param {object} props.noticeOperations Notice management functions.
 * @param {React.ReactNode} props.noticeUI The notice output.
 * @returns {React.ReactNode} Validation result.
 */
const VariantValidation = ( {
	blocks,
	clientId,
	goal,
	noticeOperations,
	noticeUI,
} ) => {
	const [ container, setContainer ] = useState( null );

	// Use a callback ref for the useEffect hook.
	const containerRef = useCallback( node => {
		setContainer( node );
	}, [] );

	useEffect( () => {
		if ( ! container ) {
			return;
		}

		const registeredGoal = Altis.Analytics.Experiments.Goals[ goal ] || null;

		if ( ! registeredGoal || ! registeredGoal.selector ) {
			noticeOperations.removeAllNotices();
			return;
		}

		// Store a ref pointer.
		const ssrContainer = container;

		/**
		 * Check if our current content is valid.
		 */
		const checkValidity = () => {
			const el = ssrContainer.querySelector( `[data-block-validation="${ clientId }"]` );
			if ( el ) {
				// clearInterval( debounce.current );
				if ( el.querySelector( registeredGoal.selector ) ) {
					noticeOperations.removeAllNotices();
				} else {
					noticeOperations.createErrorNotice(
						( registeredGoal.args && registeredGoal.args.validation_message ) ||
						sprintf( __( 'This variant does not meet the requirements for the "%s" conversion goal yet.', 'altis-analytics' ), registeredGoal.label )
					);
				}
			}
		};

		// Do an initial check incase the SSR component exists with no changes.
		checkValidity();

		// Listen for changes.
		const listener = ssrContainer.addEventListener( 'updated', checkValidity );
		watcher.observe( ssrContainer, { childList: true } );

		return () => {
			watcher.disconnect();
			ssrContainer.removeEventListener( 'update', listener );
		};
	}, [ clientId, container, goal, noticeOperations ] );

	if ( ! goal || goal === '' ) {
		return null;
	}

	return (
		<div className="altis-variant-validation">
			<Disabled>
				<div ref={ containerRef }>
					<MemoisedSSR
						clientId={ clientId }
						content={ serialize( blocks ) }
					/>
				</div>
			</Disabled>
			{ noticeUI }
		</div>
	);
};

export default withNotices( VariantValidation );
