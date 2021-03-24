import React, { useEffect, useRef, useState } from 'react';

const registeredGoals = Altis.Analytics.Experiments.Goals || {};

const { serverSideRender: ServerSideRender } = wp;
const { serialize } = wp.blocks;
const { Disabled, Spinner, withNotices } = wp.components;
const { __ } = wp.i18n;

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
	const debounce = useRef();

	useEffect( () => {
		const registeredGoal = registeredGoals[ goal ] || null;

		if ( ! registeredGoal.selector ) {
			noticeOperations.removeAllNotices();
			return;
		}

		clearInterval( debounce.current );

		// Poll for the element existing.
		debounce.current = setInterval( () => {
			const el = document.querySelector( `[data-block-validation="${ clientId }"]` );
			if ( el ) {
				clearInterval( debounce.current );
				if ( el.querySelector( registeredGoal.selector ) ) {
					noticeOperations.removeAllNotices();
				} else {
					noticeOperations.createErrorNotice(
						( registeredGoal.args && registeredGoal.args.validation_message ) ||
						__( 'This variant does not meet the requirements for this conversion goal yet.', 'altis-analytics' )
					);
				}
			}
		}, 500 );

		return () => {
			clearInterval( debounce.current );
		};
	}, [ clientId, goal, noticeOperations ] );

	if ( ! goal ) {
		return null;
	}

	return (
		<div className="altis-variant-validation">
			<Disabled>
				<ServerSideRender
					attributes={ {
						clientId,
						content: serialize( blocks ),
					} }
					block="altis/shim"
					httpMethod="POST"
					LoadingResponsePlaceholder={ () => (
						<p>
							<Spinner />
							{ ' ' }
							{ __( 'Validating...', 'altis-analytics' ) }
						</p>
					) }
				/>
			</Disabled>
			{ noticeUI }
		</div>
	);
};

export default withNotices( VariantValidation );
